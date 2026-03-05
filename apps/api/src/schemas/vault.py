"""Pydantic schemas for vault request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field


class CreateVaultRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    vault_type: str = Field(..., pattern=r"^(entity|division|counterparty|contract|task|document)$")
    vault_level: int = Field(default=4, ge=1, le=4)
    parent_vault_id: str | None = None
    module_type: str | None = Field(
        default=None, pattern=r"^(contracts|crm|tasks|calendar|documents)$"
    )
    metadata: dict = Field(default_factory=dict)


class UpdateVaultRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=500)
    metadata: dict | None = None
    parent_vault_id: str | None = None


class VaultResponse(BaseModel):
    id: str
    workspace_id: str
    parent_vault_id: str | None
    vault_level: int
    name: str
    slug: str
    vault_type: str
    module_type: str | None
    chamber: str | None
    gate: str | None
    metadata: dict
    health_score: float | None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None

    model_config = {"from_attributes": True}


class VaultListResponse(BaseModel):
    vaults: list[VaultResponse]
    total: int
