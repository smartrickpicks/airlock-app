"""add otto sessions and messages tables

Revision ID: 006
Revises: 005
Create Date: 2026-03-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

# revision identifiers
revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "otto_sessions",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("vault_id", sa.Text(), nullable=False, index=True),
        sa.Column("user_id", sa.Text(), nullable=False, index=True),
        sa.Column("workspace_id", sa.Text(), nullable=False, index=True),
        sa.Column("model_used", sa.Text(), nullable=True),
        sa.Column("enrichment_snapshot", JSONB(), server_default="{}", nullable=False),
        sa.Column("tool_calls_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_tokens", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_cost", sa.Numeric(10, 6), server_default="0", nullable=False),
        sa.Column("message_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "last_message_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "otto_messages",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "session_id",
            sa.Text(),
            sa.ForeignKey("otto_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("tool_calls", JSONB(), nullable=True),
        sa.Column("tool_results", JSONB(), nullable=True),
        sa.Column("tool_name", sa.Text(), nullable=True),
        sa.Column("model", sa.Text(), nullable=True),
        sa.Column("tokens_used", sa.Integer(), nullable=True),
        sa.Column("cost", sa.Numeric(10, 6), nullable=True),
        sa.Column("enrichment_sources_used", ARRAY(sa.Text()), nullable=True),
        sa.Column("finish_reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("idx_otto_messages_session", "otto_messages", ["session_id", "created_at"])


def downgrade() -> None:
    op.drop_index("idx_otto_messages_session")
    op.drop_table("otto_messages")
    op.drop_table("otto_sessions")
