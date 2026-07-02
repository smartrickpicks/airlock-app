"""add playbook instance and node state tables

Revision ID: 013
Revises: 012
Create Date: 2026-03-09

Creates:
- playbook_instances: runtime state of playbook executions (attached to vaults)
- playbook_node_states: per-node state within a playbook instance
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "013"
down_revision: str = "012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- playbook_instances ---
    op.create_table(
        "playbook_instances",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        # Template reference
        sa.Column("template_id", sa.String(length=100), nullable=False),
        # Vault attachment (1:1 per MAGS spec)
        sa.Column("vault_id", sa.Text(), nullable=True),
        # Lifecycle status
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="draft",
        ),
        # Flexible metadata
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        # Timestamps
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_playbook_instances_workspace_id",
        "playbook_instances",
        ["workspace_id"],
    )
    op.create_index(
        "ix_playbook_instances_template_id",
        "playbook_instances",
        ["template_id"],
    )
    op.create_index(
        "ix_playbook_instances_vault_id",
        "playbook_instances",
        ["vault_id"],
    )

    # --- playbook_node_states ---
    op.create_table(
        "playbook_node_states",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("instance_id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        # Template node reference
        sa.Column("node_id", sa.String(length=100), nullable=False),
        # Execution status
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
        # Actor and archetype
        sa.Column("actor", sa.String(length=20), nullable=False),
        sa.Column("archetype", sa.String(length=50), nullable=True),
        # Execution results
        sa.Column(
            "result",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "gate_response",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        # Flexible metadata
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        # Timestamps
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
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
        # Constraints
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_playbook_node_states_instance_id",
        "playbook_node_states",
        ["instance_id"],
    )
    op.create_index(
        "ix_playbook_node_states_workspace_id",
        "playbook_node_states",
        ["workspace_id"],
    )


def downgrade() -> None:
    # playbook_node_states
    op.drop_index(
        "ix_playbook_node_states_workspace_id",
        table_name="playbook_node_states",
    )
    op.drop_index(
        "ix_playbook_node_states_instance_id",
        table_name="playbook_node_states",
    )
    op.drop_table("playbook_node_states")

    # playbook_instances
    op.drop_index(
        "ix_playbook_instances_vault_id",
        table_name="playbook_instances",
    )
    op.drop_index(
        "ix_playbook_instances_template_id",
        table_name="playbook_instances",
    )
    op.drop_index(
        "ix_playbook_instances_workspace_id",
        table_name="playbook_instances",
    )
    op.drop_table("playbook_instances")
