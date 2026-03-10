"""Pydantic schemas for WorkspaceConfig API requests and responses."""

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

VALID_MODULES = {"contracts", "crm", "triage", "calendar", "documents"}
_HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$")


class WorkspaceConfigCreate(BaseModel):
    """Schema for provisioning a new workspace config."""

    workspace_id: str

    # Domain
    custom_domain: str | None = Field(None, max_length=253)
    vercel_domain: str | None = Field(None, max_length=253)

    # Branding
    logo_url: str | None = None
    accent_color: str = "#00d1ff"

    # Modules
    enabled_modules: list[Literal["contracts", "crm", "triage", "calendar", "documents"]] = Field(
        default_factory=lambda: ["contracts", "crm", "triage", "calendar", "documents"]
    )

    # AI
    ai_provider: Literal["anthropic", "openai", "google"] | None = None
    ai_api_key: str | None = Field(None, min_length=1)  # plain-text; encrypted before storage
    ai_tier: Literal["none", "byok", "managed"] = "none"

    # Google Workspace
    google_refresh_token: str | None = Field(
        None, min_length=1
    )  # plain-text; encrypted before storage
    google_scopes_granted: list[str] | None = None

    # Billing
    billing_tier: Literal["beta", "starter", "team", "enterprise"] = "beta"
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None

    # Limits
    max_users: int = 999
    max_vaults: int = 999

    metadata: dict = Field(default_factory=dict)

    @field_validator("accent_color")
    @classmethod
    def validate_accent_color(cls, v: str) -> str:
        if not _HEX_COLOR_RE.match(v):
            raise ValueError("accent_color must be a hex color (e.g., #00d1ff)")
        return v

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, v: str | None) -> str | None:
        if v is not None and not v.startswith(("https://", "http://localhost")):
            raise ValueError("logo_url must be an HTTPS URL")
        return v


class WorkspaceConfigUpdate(BaseModel):
    """Schema for partial update of workspace config. All fields optional."""

    # Domain
    custom_domain: str | None = Field(None, max_length=253)
    vercel_domain: str | None = Field(None, max_length=253)

    # Branding
    logo_url: str | None = None
    accent_color: str | None = None

    # Modules
    enabled_modules: list[Literal["contracts", "crm", "triage", "calendar", "documents"]] | None = (
        None
    )

    # AI
    ai_provider: Literal["anthropic", "openai", "google"] | None = None
    ai_api_key: str | None = Field(None, min_length=1)  # plain-text; encrypted before storage
    ai_tier: Literal["none", "byok", "managed"] | None = None

    # Google Workspace
    google_refresh_token: str | None = Field(
        None, min_length=1
    )  # plain-text; encrypted before storage
    google_scopes_granted: list[str] | None = None

    # Billing
    billing_tier: Literal["beta", "starter", "team", "enterprise"] | None = None
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None

    # Limits
    max_users: int | None = None
    max_vaults: int | None = None

    metadata: dict | None = None

    @field_validator("accent_color")
    @classmethod
    def validate_accent_color(cls, v: str | None) -> str | None:
        if v is not None and not _HEX_COLOR_RE.match(v):
            raise ValueError("accent_color must be a hex color (e.g., #00d1ff)")
        return v

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, v: str | None) -> str | None:
        if v is not None and not v.startswith(("https://", "http://localhost")):
            raise ValueError("logo_url must be an HTTPS URL")
        return v


class WorkspaceConfigResponse(BaseModel):
    """API response schema. Excludes encrypted fields."""

    id: str
    workspace_id: str

    # Domain
    custom_domain: str | None = None
    vercel_domain: str | None = None
    domain_verified: bool = False

    # Branding
    logo_url: str | None = None
    accent_color: str = "#00d1ff"

    # Modules
    enabled_modules: list[str]

    # AI (never expose keys)
    ai_provider: str | None = None
    ai_tier: str = "none"
    has_ai_key: bool = False  # derived: ai_api_key_encrypted is not None

    # Google Workspace (never expose tokens)
    google_scopes_granted: list[str] | None = None
    has_google_token: bool = False  # derived: google_refresh_token_encrypted is not None

    # Billing (Stripe IDs excluded — only exposed via admin-scoped endpoints)
    billing_tier: str = "beta"

    # Limits
    max_users: int = 999
    max_vaults: int = 999

    metadata: dict = Field(default_factory=dict)

    # Timestamps
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PublicResolveResponse(BaseModel):
    """Minimal schema for the unauthenticated /resolve endpoint.

    Excludes all billing, Stripe, limit, and encrypted-field indicators.
    Only includes what the Next.js middleware and early UI rendering need.
    """

    id: str
    workspace_id: str

    # Domain
    custom_domain: str | None = None
    domain_verified: bool = False

    # Branding
    logo_url: str | None = None
    accent_color: str = "#00d1ff"

    # Modules
    enabled_modules: list[str]

    # AI (only tier, no key indicators)
    ai_provider: str | None = None
    ai_tier: str = "none"

    model_config = {"from_attributes": True}
