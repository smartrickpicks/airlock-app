"""add invites table

Revision ID: 017
Revises: 016
Create Date: 2026-03-11

Creates the invites table for persistent workspace invitation records.
Replaces the in-memory _invites dict in routes/invites.py.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "017"
down_revision: str = "016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "invites",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("code", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="member"),
        sa.Column("module_roles", JSONB(), server_default="{}", nullable=False),
        sa.Column("invited_by", sa.Text(), nullable=False),
        sa.Column("accepted_by", sa.Text(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", JSONB(), server_default="{}", nullable=False),
    )

    # Unique index on invite code (for lookup)
    op.create_index("idx_invites_code", "invites", ["code"], unique=True)
    # Index on workspace_id (for RLS and admin listing)
    op.create_index("idx_invites_workspace_id", "invites", ["workspace_id"])
    # Index on email (for lookup by email)
    op.create_index("idx_invites_email", "invites", ["email"])


def downgrade() -> None:
    op.drop_index("idx_invites_email", table_name="invites")
    op.drop_index("idx_invites_workspace_id", table_name="invites")
    op.drop_index("idx_invites_code", table_name="invites")
    op.drop_table("invites")
