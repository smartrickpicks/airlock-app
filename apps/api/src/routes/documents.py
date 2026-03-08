"""Document routes — upload, retrieve, and list stored artifacts."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.schemas.document import (
    DocumentContentResponse,
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
)
from src.services.document import get_document, get_document_text, list_documents, upload_document
from src.services.event import create_event

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


def _document_to_response(document) -> DocumentResponse:
    return DocumentResponse(
        id=document.id,
        vault_id=document.vault_id,
        workspace_id=document.workspace_id,
        filename=document.filename,
        file_format=document.file_format,
        file_size_bytes=document.file_size_bytes,
        storage_path=document.storage_path,
        document_type=document.document_type,
        status=document.status,
        full_text=document.full_text,
        page_count=document.page_count,
        metadata=document.metadata_,
        uploaded_by=document.uploaded_by,
        created_at=document.created_at,
        updated_at=document.updated_at,
        deleted_at=document.deleted_at,
    )


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document_route(
    file: UploadFile = File(...),  # noqa: B008
    vault_id: str | None = Form(default=None),  # noqa: B008
    document_type: str | None = Form(default=None),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> DocumentUploadResponse:
    """Upload a single document and attempt PDF parsing immediately."""
    workspace_id = current_user.get("workspace_id", "")
    uploaded_by = current_user.get("sub")

    document = await upload_document(
        db,
        file=file,
        workspace_id=workspace_id,
        vault_id=vault_id,
        uploaded_by=uploaded_by,
        document_type=document_type,
    )

    if vault_id is not None:
        create_event(
            db,
            vault_id=vault_id,
            workspace_id=workspace_id,
            event_type="document_uploaded",
            actor_id=uploaded_by,
            payload={
                "document_id": document.id,
                "filename": document.filename,
                "status": document.status,
            },
        )

    return DocumentUploadResponse(
        document=_document_to_response(document),
        parsed=document.status == "parsed",
    )


@router.get("")
def list_documents_route(
    vault_id: str | None = Query(default=None),  # noqa: B008
    limit: int = Query(default=50, ge=1, le=200),  # noqa: B008
    offset: int = Query(default=0, ge=0),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> DocumentListResponse:
    """List documents for the current workspace."""
    workspace_id = current_user.get("workspace_id", "")
    documents = list_documents(
        db,
        workspace_id,
        vault_id=vault_id,
        limit=limit,
        offset=offset,
    )
    return DocumentListResponse(
        documents=[_document_to_response(document) for document in documents],
        total=len(documents),
    )


@router.get("/{document_id}")
def get_document_route(
    document_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> DocumentResponse:
    """Fetch a single document record."""
    workspace_id = current_user.get("workspace_id", "")
    document = get_document(db, document_id, workspace_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return _document_to_response(document)


@router.get("/{document_id}/content")
def get_document_content_route(
    document_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> DocumentContentResponse:
    """Fetch parsed text content for a single document."""
    workspace_id = current_user.get("workspace_id", "")
    document = get_document(db, document_id, workspace_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentContentResponse(
        document_id=document.id,
        full_text=get_document_text(db, document_id, workspace_id),
    )
