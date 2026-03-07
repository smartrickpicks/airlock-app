"""Add pi_assessments table.

Revision ID: 004
Revises: 003
Create Date: 2026-03-07
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: str = "003"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "pi_assessments",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("pi_profile", sa.String(30), nullable=False),
        sa.Column("meta_archetype", sa.String(20), nullable=False),
        sa.Column(
            "behavioral_factors",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "ux_preferences",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "assessment_source",
            sa.String(30),
            nullable=False,
            server_default="admin_assigned",
        ),
        sa.Column(
            "assessed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_pi_assessments_user_id"),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            name="fk_pi_assessments_workspace_id",
        ),
        sa.UniqueConstraint("user_id", "workspace_id", name="uq_pi_assessment_user_workspace"),
    )
    op.create_index(
        "ix_pi_assessments_workspace_id",
        "pi_assessments",
        ["workspace_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_pi_assessments_workspace_id", table_name="pi_assessments")
    op.drop_table("pi_assessments")
