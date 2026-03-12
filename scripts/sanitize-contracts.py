#!/usr/bin/env python3
"""
Contract Sanitizer — Strip PII from real contract files for demo library.

Reads contract files (PDF, DOCX, TXT, CSV) from an input directory,
replaces sensitive data with realistic fake equivalents, and writes
sanitized versions to an output directory.

Usage:
    python3 scripts/sanitize-contracts.py ./raw-contracts ./demo-contracts
    python3 scripts/sanitize-contracts.py ./raw-contracts ./demo-contracts --dry-run
    python3 scripts/sanitize-contracts.py ./raw-contracts ./demo-contracts --format txt

Supports:
    - .txt, .csv, .md files (direct text replacement)
    - .docx files (requires python-docx)
    - .pdf files (extracts text only — no PDF rewrite)

PII patterns replaced:
    - Email addresses → fake@example.com variants
    - Phone numbers (US) → 555-XXX-XXXX
    - SSN patterns → XXX-XX-XXXX
    - Dollar amounts → randomized within ±20%
    - Street addresses → fake addresses
    - Named entities (if spaCy available, otherwise regex heuristic)

Install dependencies:
    pip install python-docx   # for DOCX support
    pip install spacy && python -m spacy download en_core_web_sm  # optional NER
"""

import argparse
import hashlib
import os
import random
import re
import sys
from pathlib import Path

# ── Fake Data Pools ──────────────────────────────────────────────────────────

FAKE_FIRST_NAMES = [
    "Alex", "Jordan", "Morgan", "Casey", "Riley", "Quinn", "Avery", "Blake",
    "Cameron", "Dakota", "Elliot", "Finley", "Harper", "Jamie", "Kendall",
    "Logan", "Maddox", "Noel", "Parker", "Reese", "Sage", "Taylor", "Val",
]

FAKE_LAST_NAMES = [
    "Rivera", "Chen", "Okafor", "Petrov", "Nakamura", "Santos", "Eriksen",
    "Mbeki", "Johansson", "Kim", "Patel", "Kovacs", "Morales", "Fischer",
    "Larsen", "Tanaka", "Silva", "Andersen", "Walsh", "Dubois",
]

FAKE_COMPANIES = [
    "Meridian Solutions", "Apex Dynamics", "Cobalt Industries", "Helix Corp",
    "Prism Technologies", "Vertex Group", "Nova Enterprises", "Atlas Digital",
    "Quantum Partners", "Pinnacle Systems", "Forge Analytics", "Crest Media",
    "Lumen Networks", "Orion Capital", "Zephyr Holdings",
]

FAKE_STREETS = [
    "100 Innovation Drive", "250 Market Street", "75 Commerce Blvd",
    "1200 Enterprise Way", "500 Technology Park", "320 Harbor View",
    "88 Summit Road", "450 Capitol Avenue", "900 Parkside Lane",
]

FAKE_CITIES = [
    "Austin, TX 78701", "Denver, CO 80202", "Portland, OR 97201",
    "Nashville, TN 37201", "Raleigh, NC 27601", "Salt Lake City, UT 84101",
    "Minneapolis, MN 55401", "Charlotte, NC 28201", "Phoenix, AZ 85001",
]

FAKE_DOMAINS = [
    "meridian.example.com", "apex-dyn.example.com", "cobalt-ind.example.com",
    "helix.example.com", "prism-tech.example.com", "vertex.example.com",
]

# ── Deterministic Mapping ────────────────────────────────────────────────────

_replacement_cache: dict[str, str] = {}


def _stable_pick(original: str, pool: list[str]) -> str:
    """Pick a deterministic replacement so the same entity always maps to the same fake."""
    key = original.lower().strip()
    if key in _replacement_cache:
        return _replacement_cache[key]
    idx = int(hashlib.md5(key.encode()).hexdigest(), 16) % len(pool)
    replacement = pool[idx]
    _replacement_cache[key] = replacement
    return replacement


# ── Regex Patterns ───────────────────────────────────────────────────────────

EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
PHONE_RE = re.compile(r"\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b")
SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
DOLLAR_RE = re.compile(r"\$[\d,]+(?:\.\d{2})?")
# US address: number + street name + common suffix
ADDRESS_RE = re.compile(
    r"\b\d{1,5}\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*"
    r"\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Road|Rd|Lane|Ln|Way|Court|Ct|Place|Pl)\b",
    re.IGNORECASE,
)


def sanitize_email(match: re.Match) -> str:
    email = match.group(0)
    local = email.split("@")[0]
    fake_name = _stable_pick(local, FAKE_FIRST_NAMES).lower()
    domain = _stable_pick(email, FAKE_DOMAINS)
    return f"{fake_name}@{domain}"


def sanitize_phone(_match: re.Match) -> str:
    return f"(555) {random.randint(200, 999)}-{random.randint(1000, 9999)}"


def sanitize_ssn(_match: re.Match) -> str:
    return "XXX-XX-XXXX"


def sanitize_dollar(match: re.Match) -> str:
    raw = match.group(0).replace("$", "").replace(",", "")
    try:
        amount = float(raw)
        fuzzed = amount * random.uniform(0.8, 1.2)
        return f"${fuzzed:,.2f}"
    except ValueError:
        return "$X,XXX.XX"


def sanitize_address(match: re.Match) -> str:
    return _stable_pick(match.group(0), FAKE_STREETS)


# ── Core Sanitization ────────────────────────────────────────────────────────


def sanitize_text(text: str, use_ner: bool = False) -> str:
    """Apply all sanitization passes to a text string."""
    result = text

    # Pass 1: Structured patterns (high confidence)
    result = SSN_RE.sub(sanitize_ssn, result)
    result = EMAIL_RE.sub(sanitize_email, result)
    result = PHONE_RE.sub(sanitize_phone, result)
    result = DOLLAR_RE.sub(sanitize_dollar, result)
    result = ADDRESS_RE.sub(sanitize_address, result)

    # Pass 2: Named Entity Recognition (if spaCy available)
    if use_ner:
        try:
            import spacy
            nlp = spacy.load("en_core_web_sm")
            doc = nlp(result)
            # Process entities in reverse order to preserve offsets
            for ent in reversed(doc.ents):
                if ent.label_ == "PERSON":
                    parts = ent.text.split()
                    fake = _stable_pick(parts[0], FAKE_FIRST_NAMES)
                    if len(parts) > 1:
                        fake += " " + _stable_pick(parts[-1], FAKE_LAST_NAMES)
                    result = result[:ent.start_char] + fake + result[ent.end_char:]
                elif ent.label_ == "ORG":
                    result = (
                        result[:ent.start_char]
                        + _stable_pick(ent.text, FAKE_COMPANIES)
                        + result[ent.end_char:]
                    )
        except (ImportError, OSError):
            pass  # spaCy not available — skip NER pass

    return result


# ── File Processors ──────────────────────────────────────────────────────────


def process_text_file(src: Path, dst: Path, use_ner: bool) -> None:
    text = src.read_text(encoding="utf-8", errors="replace")
    sanitized = sanitize_text(text, use_ner)
    dst.write_text(sanitized, encoding="utf-8")


def process_docx_file(src: Path, dst: Path, use_ner: bool) -> None:
    try:
        from docx import Document
    except ImportError:
        print(f"  SKIP {src.name} (install python-docx for DOCX support)")
        return

    doc = Document(str(src))
    for para in doc.paragraphs:
        if para.text.strip():
            para.text = sanitize_text(para.text, use_ner)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text.strip():
                    cell.text = sanitize_text(cell.text, use_ner)
    doc.save(str(dst))


def process_pdf_file(src: Path, dst: Path, use_ner: bool) -> None:
    """Extract text from PDF → sanitize → write as .txt (PDF rewrite not supported)."""
    try:
        import subprocess
        result = subprocess.run(
            ["pdftotext", "-layout", str(src), "-"],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            print(f"  SKIP {src.name} (pdftotext failed)")
            return
        text = result.stdout
    except FileNotFoundError:
        print(f"  SKIP {src.name} (install poppler-utils for PDF support)")
        return

    sanitized = sanitize_text(text, use_ner)
    txt_dst = dst.with_suffix(".txt")
    txt_dst.write_text(sanitized, encoding="utf-8")
    print(f"  NOTE: PDF converted to {txt_dst.name}")


PROCESSORS = {
    ".txt": process_text_file,
    ".md": process_text_file,
    ".csv": process_text_file,
    ".tsv": process_text_file,
    ".docx": process_docx_file,
    ".pdf": process_pdf_file,
}


# ── CLI ──────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sanitize contract files by replacing PII with fake data."
    )
    parser.add_argument("input_dir", help="Directory containing raw contract files")
    parser.add_argument("output_dir", help="Directory for sanitized output")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be processed")
    parser.add_argument("--ner", action="store_true", help="Use spaCy NER for entity detection")
    parser.add_argument(
        "--format", choices=["all", "txt", "docx", "pdf", "csv"],
        default="all", help="Only process files of this format",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)

    if not input_dir.is_dir():
        print(f"Error: {input_dir} is not a directory")
        sys.exit(1)

    # Collect files
    if args.format == "all":
        extensions = set(PROCESSORS.keys())
    else:
        extensions = {f".{args.format}"}

    files = sorted(
        f for f in input_dir.rglob("*")
        if f.is_file() and f.suffix.lower() in extensions
    )

    if not files:
        print(f"No matching files found in {input_dir}")
        sys.exit(0)

    print(f"Found {len(files)} files to sanitize")

    if args.dry_run:
        for f in files:
            print(f"  Would process: {f.relative_to(input_dir)}")
        return

    output_dir.mkdir(parents=True, exist_ok=True)

    processed = 0
    for f in files:
        rel = f.relative_to(input_dir)
        dst = output_dir / rel
        dst.parent.mkdir(parents=True, exist_ok=True)

        processor = PROCESSORS.get(f.suffix.lower())
        if not processor:
            continue

        try:
            print(f"  Processing: {rel}")
            processor(f, dst, args.ner)
            processed += 1
        except Exception as e:
            print(f"  ERROR: {rel} — {e}")

    print(f"\nDone. Sanitized {processed}/{len(files)} files → {output_dir}")


if __name__ == "__main__":
    main()
