"""add mcp servers and skills tables

Revision ID: 009
Revises: 008
Create Date: 2026-03-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "009"
down_revision: str | None = "008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "mcp_servers",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("workspace_id", sa.Text(), nullable=False, index=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("endpoint_url", sa.Text(), nullable=False),
        sa.Column("auth_type", sa.Text(), nullable=True),
        sa.Column("auth_config", JSONB(), server_default="{}", nullable=False),
        sa.Column("status", sa.Text(), server_default="inactive", nullable=False),
        sa.Column("capabilities", JSONB(), server_default="[]", nullable=False),
        sa.Column("health_check_url", sa.Text(), nullable=True),
        sa.Column("last_health_at", sa.DateTime(timezone=True), nullable=True),
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
    )

    op.create_table(
        "skills",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("workspace_id", sa.Text(), nullable=False, index=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("skill_type", sa.Text(), nullable=True),
        sa.Column(
            "mcp_server_id",
            sa.Text(),
            sa.ForeignKey("mcp_servers.id"),
            nullable=True,
        ),
        sa.Column("tool_name", sa.Text(), nullable=True),
        sa.Column("config", JSONB(), server_default="{}", nullable=False),
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
    )


def downgrade() -> None:
    op.drop_table("skills")
    op.drop_table("mcp_servers")
