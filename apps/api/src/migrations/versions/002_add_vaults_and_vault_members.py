"""add vaults and vault_members tables

Revision ID: 002
Revises: 001
Create Date: 2026-03-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: str = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "vaults",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("parent_vault_id", sa.Text(), nullable=True),
        sa.Column("vault_level", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("name", sa.String(length=500), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("vault_type", sa.String(length=50), nullable=False),
        sa.Column("module_type", sa.String(length=50), nullable=True),
        sa.Column("chamber", sa.String(length=20), nullable=True, server_default="discover"),
        sa.Column("gate", sa.String(length=50), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("health_score", sa.Float(), nullable=True),
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
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], name="fk_vaults_workspace"),
        sa.ForeignKeyConstraint(
            ["parent_vault_id"], ["vaults.id"], name="fk_vaults_parent", ondelete="SET NULL"
        ),
        sa.UniqueConstraint("workspace_id", "slug", name="uq_vaults_workspace_slug"),
        sa.CheckConstraint("vault_level BETWEEN 1 AND 4", name="ck_vaults_level_range"),
    )
    op.create_index("ix_vaults_workspace_id", "vaults", ["workspace_id"])
    op.create_index("ix_vaults_parent_vault_id", "vaults", ["parent_vault_id"])
    op.create_index("ix_vaults_workspace_module", "vaults", ["workspace_id", "module_type"])
    op.create_index("ix_vaults_workspace_level", "vaults", ["workspace_id", "vault_level"])

    op.create_table(
        "vault_members",
        sa.Column("vault_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="viewer"),
        sa.Column("inherited", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("vault_id", "user_id"),
        sa.ForeignKeyConstraint(
            ["vault_id"], ["vaults.id"], name="fk_vault_members_vault", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_vault_members_user"),
    )


def downgrade() -> None:
    op.drop_table("vault_members")
    op.drop_index("ix_vaults_workspace_level", table_name="vaults")
    op.drop_index("ix_vaults_workspace_module", table_name="vaults")
    op.drop_index("ix_vaults_parent_vault_id", table_name="vaults")
    op.drop_index("ix_vaults_workspace_id", table_name="vaults")
    op.drop_table("vaults")
