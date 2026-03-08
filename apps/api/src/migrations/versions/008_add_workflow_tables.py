"""add workflow tables

Revision ID: 008
Revises: 007
Create Date: 2026-03-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "008"
down_revision: str | None = "007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workflows",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("workspace_id", sa.Text(), nullable=False, index=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.Text(), nullable=True),
        sa.Column("definition", JSONB(), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("status", sa.Text(), server_default="draft", nullable=False),
        sa.Column("trigger_type", sa.Text(), nullable=True),
        sa.Column("trigger_config", JSONB(), server_default="{}", nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "workflow_runs",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "workflow_id", sa.Text(), sa.ForeignKey("workflows.id"), nullable=False, index=True
        ),
        sa.Column("workspace_id", sa.Text(), nullable=False, index=True),
        sa.Column("status", sa.Text(), server_default="running", nullable=False),
        sa.Column("trigger_data", JSONB(), server_default="{}", nullable=False),
        sa.Column("context", JSONB(), server_default="{}", nullable=False),
        sa.Column("node_log", JSONB(), server_default="[]", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("workflow_runs")
    op.drop_table("workflows")
