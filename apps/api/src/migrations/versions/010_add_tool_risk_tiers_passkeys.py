"""add tool risk tiers, passkeys, and user connections

Revision ID: 010
Revises: 009
Create Date: 2026-03-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

revision: str = "010"
down_revision: str | None = "009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspace_mcp_tool_permissions",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("workspace_id", sa.Text(), nullable=False, index=True),
        sa.Column(
            "mcp_server_id",
            sa.Text(),
            sa.ForeignKey("mcp_servers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tool_name", sa.Text(), nullable=False),
        sa.Column("risk_tier", sa.Text(), server_default="read", nullable=False),
        sa.Column(
            "allowed_org_roles",
            ARRAY(sa.Text()),
            server_default="{}",
            nullable=True,
        ),
        sa.Column(
            "module_scope",
            ARRAY(sa.Text()),
            server_default="{}",
            nullable=True,
        ),
        sa.Column(
            "enabled",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "mcp_server_id",
            "tool_name",
            name="uq_workspace_mcp_tool",
        ),
    )

    op.create_table(
        "passkey_credentials",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Text(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("workspace_id", sa.Text(), nullable=False, index=True),
        sa.Column("credential_id", sa.Text(), unique=True, nullable=False),
        sa.Column("public_key", sa.LargeBinary(), nullable=False),
        sa.Column("sign_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("aaguid", sa.Text(), nullable=True),
        sa.Column("device_name", sa.Text(), nullable=True),
        sa.Column("transports", ARRAY(sa.Text()), nullable=True),
        sa.Column(
            "backed_up",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "user_connections",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Text(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("workspace_id", sa.Text(), nullable=False, index=True),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default="connected", nullable=True),
        sa.Column("account_label", sa.Text(), nullable=True),
        sa.Column("auth_config", JSONB(), server_default="{}", nullable=False),
        sa.Column("scopes", ARRAY(sa.Text()), nullable=True),
        sa.Column(
            "connected_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "user_id",
            "workspace_id",
            "provider",
            name="uq_user_workspace_provider",
        ),
    )


def downgrade() -> None:
    op.drop_table("user_connections")
    op.drop_table("passkey_credentials")
    op.drop_table("workspace_mcp_tool_permissions")
