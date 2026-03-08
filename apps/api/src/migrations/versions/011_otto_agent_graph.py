"""Add agent graph columns to otto_sessions.

Revision ID: 011
Revises: 010
"""

import sqlalchemy as sa
from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns to otto_sessions for agent graph support
    op.add_column(
        "otto_sessions",
        sa.Column("scope", sa.Text(), server_default=sa.text("'vault'"), nullable=False),
    )
    op.add_column(
        "otto_sessions",
        sa.Column("surface", sa.Text(), nullable=True),
    )
    op.add_column(
        "otto_sessions",
        sa.Column("tier_used", sa.Text(), nullable=True),
    )
    op.create_index("ix_otto_sessions_scope", "otto_sessions", ["scope"])


def downgrade() -> None:
    op.drop_index("ix_otto_sessions_scope", table_name="otto_sessions")
    op.drop_column("otto_sessions", "tier_used")
    op.drop_column("otto_sessions", "surface")
    op.drop_column("otto_sessions", "scope")
