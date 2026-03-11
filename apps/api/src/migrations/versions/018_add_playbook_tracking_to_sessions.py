"""add playbook tracking fields to otto_sessions

Revision ID: 018
Revises: 017
Create Date: 2026-03-11

Adds active_playbook_id, current_node_id, and completed_nodes to
otto_sessions so Otto can track which playbook/node is active during
a session. Supports WS3.4 (playbook state in session_service).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY

revision: str = "018"
down_revision: str = "017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("otto_sessions", sa.Column("active_playbook_id", sa.Text(), nullable=True))
    op.add_column("otto_sessions", sa.Column("current_node_id", sa.Text(), nullable=True))
    op.add_column("otto_sessions", sa.Column("completed_nodes", ARRAY(sa.Text()), nullable=True))
    op.create_index("ix_otto_sessions_active_playbook_id", "otto_sessions", ["active_playbook_id"])


def downgrade() -> None:
    op.drop_index("ix_otto_sessions_active_playbook_id", table_name="otto_sessions")
    op.drop_column("otto_sessions", "completed_nodes")
    op.drop_column("otto_sessions", "current_node_id")
    op.drop_column("otto_sessions", "active_playbook_id")
