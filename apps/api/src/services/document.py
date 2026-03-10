"""Document service — upload, local storage, and PDF text extraction.

Text extraction uses a tiered strategy:
  1. pdfplumber (best at preserving word boundaries and whitespace)
  2. pypdf fallback (simpler but sometimes concatenates words)
  3. Post-processing heuristics to fix any remaining concatenated-word issues
"""

from __future__ import annotations

import logging
import re
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.config import settings
from src.models.document import Document
from src.realtime.emitter import emit_domain_event
from src.services.search import index_document

logger = logging.getLogger(__name__)

ALLOWED_PDF_EXTENSIONS = {"pdf"}

# ---------------------------------------------------------------------------
# Heuristic: detect text that has no spaces (concatenated words)
# If a 200-char sample has fewer than 5% spaces, the extraction likely failed
# to insert word boundaries.
# ---------------------------------------------------------------------------
_MIN_SPACE_RATIO = 0.05
_SAMPLE_LEN = 200


def _uploads_root() -> Path:
    return Path(__file__).resolve().parents[2] / settings.uploads_dir


def _safe_filename(filename: str) -> str:
    base = Path(filename).name or "upload.pdf"
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-")
    return cleaned or "upload.pdf"


def detect_file_format(filename: str) -> str:
    suffix = Path(filename).suffix.lower().lstrip(".")
    return suffix or "unknown"


# ---------------------------------------------------------------------------
# Post-processing: fix concatenated words
# ---------------------------------------------------------------------------

# Pattern: lowercase letter followed by uppercase letter with no space
# e.g. "InternationalHouse" -> "International House"
_CAMEL_BOUNDARY = re.compile(r"([a-z])([A-Z])")

# Pattern: letter followed by digit or digit followed by letter with no space
# e.g. "61MosleyStreet" -> "61 Mosley Street"
_ALPHA_DIGIT_BOUNDARY = re.compile(r"([a-zA-Z])(\d)")
_DIGIT_ALPHA_BOUNDARY = re.compile(r"(\d)([a-zA-Z])")

# Pattern: period/comma/colon/semicolon followed directly by a letter (no space)
# e.g. "follows:1." -> "follows: 1."
_PUNCT_LETTER = re.compile(r"([.:;,])([A-Za-z])")

# Pattern: lowercase letter followed by opening paren or uppercase word
# e.g. "agreement(the" -> "agreement (the"
_LETTER_PAREN = re.compile(r"([a-z])(\()")

# Common words that get stuck together — detect "DearDaniele" style
# Two+ title-case words concatenated: split before each uppercase-after-lowercase
_TITLE_CONCAT = re.compile(r"([a-z]{2,})([A-Z][a-z]{2,})")


def _needs_space_repair(text: str) -> bool:
    """Return True if text appears to have missing word-boundary spaces."""
    if not text:
        return False
    # Take a sample from the middle of the text (skip headers/footers)
    start = min(len(text) // 4, 500)
    sample = text[start : start + _SAMPLE_LEN]
    if len(sample) < 50:
        sample = text[:_SAMPLE_LEN]
    if len(sample) < 20:
        return False
    space_count = sample.count(" ") + sample.count("\t")
    ratio = space_count / len(sample)
    return ratio < _MIN_SPACE_RATIO


def _repair_spaces(text: str) -> str:
    """Insert spaces at likely word boundaries in concatenated text.

    Applies multiple heuristic passes:
      1. camelCase boundaries  (lowercase -> Uppercase)
      2. digit-letter boundaries  (61Mosley -> 61 Mosley)
      3. punctuation-letter  (follows:We -> follows: We)
      4. letter-paren  (agreement(the -> agreement (the)
    """
    # Pass 1: camelCase / title-case boundaries
    text = _TITLE_CONCAT.sub(r"\1 \2", text)
    # Run twice to catch chains: "WeWriteToConfirm" -> "We Write To Confirm"
    text = _TITLE_CONCAT.sub(r"\1 \2", text)
    text = _CAMEL_BOUNDARY.sub(r"\1 \2", text)

    # Pass 2: digit-letter boundaries
    text = _ALPHA_DIGIT_BOUNDARY.sub(r"\1 \2", text)
    text = _DIGIT_ALPHA_BOUNDARY.sub(r"\1 \2", text)

    # Pass 3: punctuation-letter
    text = _PUNCT_LETTER.sub(r"\1 \2", text)

    # Pass 4: letter-paren
    text = _LETTER_PAREN.sub(r"\1 \2", text)

    return text


def _post_process_text(text: str) -> str:
    """Clean and repair extracted PDF text."""
    if not text:
        return text
    # Sanitize control characters (preserve tab, LF, CR)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", text)
    # If the text looks like it's missing spaces, apply repair heuristics
    if _needs_space_repair(text):
        logger.info("PDF text appears concatenated (low space ratio) — applying space repair")
        text = _repair_spaces(text)
    return text


# ---------------------------------------------------------------------------
# PDF text extraction — tiered strategy
# ---------------------------------------------------------------------------


def _extract_with_pdfplumber(file_bytes: bytes) -> tuple[str | None, int | None, str | None]:
    """Extract text using pdfplumber (best word boundary preservation)."""
    try:
        import pdfplumber
    except ImportError:
        return None, None, "pdfplumber not installed"

    try:
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)
            pages: list[str] = []
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                if page_text.strip():
                    pages.append(page_text.strip())
            text = "\n\n".join(pages)
            return text, page_count, None
    except Exception as exc:
        return None, None, f"pdfplumber failed: {exc}"


def _extract_with_pypdf(file_bytes: bytes) -> tuple[str | None, int | None, str | None]:
    """Extract text using pypdf (fallback)."""
    try:
        from pypdf import PdfReader
    except ImportError:
        return None, None, "pypdf not installed"

    try:
        reader = PdfReader(BytesIO(file_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n\n".join(part.strip() for part in pages if part.strip())
        return text or "", len(reader.pages), None
    except Exception as exc:
        return None, None, f"pypdf failed: {exc}"


def _extract_pdf_text(file_bytes: bytes) -> tuple[str | None, int | None, str | None]:
    """Extract text from a PDF using the best available library.

    Strategy:
      1. Try pdfplumber first — it uses pdfminer under the hood and is
         significantly better at detecting word boundaries and preserving
         whitespace in both digitally-authored and scanned PDFs.
      2. Fall back to pypdf if pdfplumber is unavailable or errors out.
      3. Apply post-processing to detect and fix any remaining concatenated
         words (camelCase splitting, digit-letter boundaries, etc.).
    """
    text: str | None = None
    page_count: int | None = None
    error: str | None = None

    # Tier 1: pdfplumber
    text, page_count, error = _extract_with_pdfplumber(file_bytes)
    if text is not None and error is None:
        logger.debug("PDF extracted via pdfplumber (%d pages)", page_count or 0)
        text = _post_process_text(text)
        return text, page_count, None

    plumber_error = error
    logger.info("pdfplumber extraction failed (%s), falling back to pypdf", plumber_error)

    # Tier 2: pypdf fallback
    text, page_count, error = _extract_with_pypdf(file_bytes)
    if text is not None and error is None:
        logger.debug("PDF extracted via pypdf fallback (%d pages)", page_count or 0)
        text = _post_process_text(text)
        return text, page_count, None

    # Both failed
    combined_error = f"All extractors failed. pdfplumber: {plumber_error}; pypdf: {error}"
    return None, None, combined_error


def _document_to_search_dict(doc: Document) -> dict:
    """Convert a Document ORM instance to a dict suitable for search indexing."""
    return {
        "id": doc.id,
        "filename": doc.filename,
        "full_text": doc.full_text,
        "document_type": doc.document_type,
        "workspace_id": doc.workspace_id,
        "vault_id": doc.vault_id,
        "status": doc.status,
        "file_format": doc.file_format,
        "created_at": str(doc.created_at) if doc.created_at else "",
    }


async def upload_document(
    db: Session,
    *,
    file: UploadFile,
    workspace_id: str,
    vault_id: str | None = None,
    uploaded_by: str | None = None,
    document_type: str | None = None,
) -> Document:
    """Persist an uploaded file and attempt PDF text extraction."""
    document_id = str(ULID())
    filename = _safe_filename(file.filename or "upload.pdf")
    file_format = detect_file_format(filename)
    file_bytes = await file.read()

    storage_dir = _uploads_root() / workspace_id / document_id
    storage_dir.mkdir(parents=True, exist_ok=True)
    storage_path = storage_dir / filename
    storage_path.write_bytes(file_bytes)

    document = Document(
        id=document_id,
        vault_id=vault_id,
        workspace_id=workspace_id,
        filename=filename,
        file_format=file_format,
        file_size_bytes=len(file_bytes),
        storage_path=str(storage_path.relative_to(_uploads_root())),
        document_type=document_type,
        status="uploaded",
        uploaded_by=uploaded_by,
        metadata_={},
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    if file_format not in ALLOWED_PDF_EXTENSIONS:
        document.status = "failed"
        document.metadata_ = {
            **document.metadata_,
            "parse_error": "Only PDF uploads are supported in the intake lab",
        }
        db.commit()
        db.refresh(document)
        return document

    full_text, page_count, parse_error = _extract_pdf_text(file_bytes)
    if parse_error:
        document.status = "failed"
        document.metadata_ = {**document.metadata_, "parse_error": parse_error}
    else:
        document.status = "parsed"
        document.full_text = full_text
        document.page_count = page_count

    db.commit()
    db.refresh(document)

    try:
        index_document(_document_to_search_dict(document))
    except Exception:
        logger.warning("Failed to index document %s in search", document.id)

    await emit_domain_event(
        topic=f"vault:{vault_id}" if vault_id else "workspace",
        event_type="document.uploaded",
        payload={"document_id": document.id, "filename": document.filename, "vault_id": vault_id},
        workspace_id=workspace_id,
        actor_id=uploaded_by,
    )

    return document


def get_document(db: Session, document_id: str, workspace_id: str) -> Document | None:
    stmt = select(Document).where(
        Document.id == document_id,
        Document.workspace_id == workspace_id,
        Document.deleted_at.is_(None),
    )
    return db.execute(stmt).scalar_one_or_none()


def list_documents(
    db: Session,
    workspace_id: str,
    *,
    vault_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Document]:
    stmt = select(Document).where(
        Document.workspace_id == workspace_id,
        Document.deleted_at.is_(None),
    )
    if vault_id is not None:
        stmt = stmt.where(Document.vault_id == vault_id)
    stmt = stmt.order_by(Document.updated_at.desc()).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


def get_document_text(db: Session, document_id: str, workspace_id: str) -> str | None:
    document = get_document(db, document_id, workspace_id)
    return None if document is None else document.full_text
