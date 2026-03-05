"""add events table

Revision ID: 003
Revises: 002
Create Date: 2026-03-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: str = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("vault_id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("actor_id", sa.Text(), nullable=True),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["vault_id"], ["vaults.id"], name="fk_events_vault"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], name="fk_events_workspace"),
    )
    op.create_index("ix_events_vault_id", "events", ["vault_id"])
    op.create_index("ix_events_workspace_id", "events", ["workspace_id"])
    op.create_index("ix_events_created_at", "events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_events_created_at", table_name="events")
    op.drop_index("ix_events_workspace_id", table_name="events")
    op.drop_index("ix_events_vault_id", table_name="events")
    op.drop_table("events")
