"""Patch schemas — Pydantic request/response models."""

from datetime import datetime

from pydantic import BaseModel


class CreatePatchRequest(BaseModel):
    field_key: str
    old_value: str | None = None
    new_value: str
    evidence: dict | None = None
    metadata: dict | None = None


class TransitionPatchRequest(BaseModel):
    action: str  # submit, approve, reject, clarify, respond
    note: str | None = None
    version: int  # Optimistic lock — must match current version


class PatchResponse(BaseModel):
    id: str
    vault_id: str
    workspace_id: str
    field_key: str
    old_value: str | None
    new_value: str
    status: str
    submitted_by: str | None
    reviewed_by: str | None
    version: int
    evidence: dict
    history: list
    metadata: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PatchListResponse(BaseModel):
    patches: list[PatchResponse]
    total: int
