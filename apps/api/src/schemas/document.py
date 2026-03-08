"""Pydantic schemas for document upload and retrieval."""

from datetime import datetime

from pydantic import BaseModel, Field


class DocumentResponse(BaseModel):
    id: str
    vault_id: str | None
    workspace_id: str
    filename: str
    file_format: str
    file_size_bytes: int
    storage_path: str
    document_type: str | None
    status: str
    full_text: str | None
    page_count: int | None
    metadata: dict = Field(default_factory=dict)
    uploaded_by: str | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


class DocumentUploadResponse(BaseModel):
    document: DocumentResponse
    parsed: bool


class DocumentContentResponse(BaseModel):
    document_id: str
    full_text: str | None
