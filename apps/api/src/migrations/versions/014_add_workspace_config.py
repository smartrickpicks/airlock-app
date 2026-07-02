"""add workspace_config table

Revision ID: 014
Revises: 013
Create Date: 2026-03-10

Creates:
- workspace_config: per-tenant branding, domain, AI, billing, limits
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "014"
down_revision: str = "013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspace_config",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        # Domain
        sa.Column("custom_domain", sa.Text(), nullable=True),
        sa.Column("vercel_domain", sa.Text(), nullable=True),
        sa.Column("domain_verified", sa.Boolean(), nullable=False, server_default="false"),
        # Branding
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("accent_color", sa.Text(), nullable=False, server_default="#00d1ff"),
        # Modules
        sa.Column(
            "enabled_modules",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default='["contracts","crm","triage","calendar","documents"]',
        ),
        # AI
        sa.Column("ai_provider", sa.Text(), nullable=True),
        sa.Column("ai_api_key_encrypted", sa.Text(), nullable=True),
        sa.Column("ai_tier", sa.Text(), nullable=False, server_default="none"),
        # Google Workspace
        sa.Column("google_refresh_token_encrypted", sa.Text(), nullable=True),
        sa.Column(
            "google_scopes_granted",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        # Billing
        sa.Column("billing_tier", sa.Text(), nullable=False, server_default="beta"),
        sa.Column("stripe_customer_id", sa.Text(), nullable=True),
        sa.Column("stripe_subscription_id", sa.Text(), nullable=True),
        # Limits
        sa.Column("max_users", sa.Integer(), nullable=False, server_default="999"),
        sa.Column("max_vaults", sa.Integer(), nullable=False, server_default="999"),
        # Metadata
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", name="uq_workspace_config_workspace_id"),
    )
    op.create_index(
        "ix_workspace_config_workspace_id",
        "workspace_config",
        ["workspace_id"],
    )
    # Partial unique index: only one config per custom domain (when set)
    op.create_index(
        "ix_workspace_config_custom_domain",
        "workspace_config",
        ["custom_domain"],
        unique=True,
        postgresql_where=sa.text("custom_domain IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_workspace_config_custom_domain",
        table_name="workspace_config",
    )
    op.drop_index(
        "ix_workspace_config_workspace_id",
        table_name="workspace_config",
    )
    op.drop_table("workspace_config")
