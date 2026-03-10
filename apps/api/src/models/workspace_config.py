"""WorkspaceConfig model — per-tenant branding, domain, AI, billing settings.

One row per workspace. Stores white-label configuration including custom domain,
branding tokens, enabled modules, AI provider credentials (encrypted), Google
Workspace integration, and billing/limit overrides.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class WorkspaceConfig(Base):
    __tablename__ = "workspace_config"
    __table_args__ = (UniqueConstraint("workspace_id", name="uq_workspace_config_workspace_id"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)

    # Domain
    custom_domain: Mapped[str | None] = mapped_column(Text, nullable=True)
    vercel_domain: Mapped[str | None] = mapped_column(Text, nullable=True)
    domain_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    # Branding
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    accent_color: Mapped[str] = mapped_column(Text, nullable=False, server_default="#00d1ff")

    # Modules
    enabled_modules: Mapped[dict] = mapped_column(
        JSONB(astext_type=Text()),
        nullable=False,
        server_default='["contracts","crm","triage","calendar","documents"]',
    )

    # AI
    ai_provider: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_api_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_tier: Mapped[str] = mapped_column(Text, nullable=False, server_default="none")

    # Google Workspace
    google_refresh_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_scopes_granted: Mapped[dict | None] = mapped_column(
        JSONB(astext_type=Text()), nullable=True
    )

    # Billing (feature-flagged)
    billing_tier: Mapped[str] = mapped_column(Text, nullable=False, server_default="beta")
    stripe_customer_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Limits
    max_users: Mapped[int] = mapped_column(Integer, nullable=False, server_default="999")
    max_vaults: Mapped[int] = mapped_column(Integer, nullable=False, server_default="999")

    # Flexible metadata
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}", nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
