"""Pydantic schemas for WorkspaceConfig API requests and responses."""

from datetime import datetime

from pydantic import BaseModel, Field


class WorkspaceConfigCreate(BaseModel):
    """Schema for provisioning a new workspace config."""

    workspace_id: str

    # Domain
    custom_domain: str | None = None
    vercel_domain: str | None = None

    # Branding
    logo_url: str | None = None
    accent_color: str = "#00d1ff"

    # Modules
    enabled_modules: list[str] = Field(
        default_factory=lambda: ["contracts", "crm", "triage", "calendar", "documents"]
    )

    # AI
    ai_provider: str | None = None
    ai_api_key: str | None = None  # plain-text; encrypted before storage
    ai_tier: str = "none"

    # Google Workspace
    google_refresh_token: str | None = None  # plain-text; encrypted before storage
    google_scopes_granted: list[str] | None = None

    # Billing
    billing_tier: str = "beta"
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None

    # Limits
    max_users: int = 999
    max_vaults: int = 999

    metadata: dict = Field(default_factory=dict)


class WorkspaceConfigUpdate(BaseModel):
    """Schema for partial update of workspace config. All fields optional."""

    # Domain
    custom_domain: str | None = None
    vercel_domain: str | None = None

    # Branding
    logo_url: str | None = None
    accent_color: str | None = None

    # Modules
    enabled_modules: list[str] | None = None

    # AI
    ai_provider: str | None = None
    ai_api_key: str | None = None  # plain-text; encrypted before storage
    ai_tier: str | None = None

    # Google Workspace
    google_refresh_token: str | None = None  # plain-text; encrypted before storage
    google_scopes_granted: list[str] | None = None

    # Billing
    billing_tier: str | None = None
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None

    # Limits
    max_users: int | None = None
    max_vaults: int | None = None

    metadata: dict | None = None


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

    # Billing
    billing_tier: str = "beta"
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None

    # Limits
    max_users: int = 999
    max_vaults: int = 999

    metadata: dict = Field(default_factory=dict)

    # Timestamps
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
