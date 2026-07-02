"""add MAGS profile storage tables

Revision ID: 012
Revises: 011
Create Date: 2026-03-09

Creates:
- user_profiles: user-scoped PI behavioral profiles (NO workspace_id)
- user_profile_changelog: append-only audit trail for profile changes
- workspace_memberships: user membership in workspaces with org roles + privacy
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "012"
down_revision: str = "011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- user_profiles ---
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        # Profile match
        sa.Column("pi_profile", sa.String(length=50), nullable=False),
        sa.Column("meta_archetype", sa.String(length=20), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        # Drives — DECF vector as JSONB
        sa.Column(
            "drives",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        # Signal provenance
        sa.Column("source", sa.String(length=50), nullable=False, server_default="conversation"),
        # Layer 2+ enrichment (grows over time)
        sa.Column(
            "work_dimensions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        # MAGS config — how Otto behaves for this user
        sa.Column(
            "mags_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        # Workspace + cognitive preferences
        sa.Column(
            "workspace_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        # Connected signal sources
        sa.Column(
            "signals",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        # Privacy / sovereignty controls
        sa.Column(
            "sovereignty",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        # Timestamps
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
        sa.UniqueConstraint("user_id", name="uq_user_profiles_user_id"),
    )
    op.create_index("ix_user_profiles_user_id", "user_profiles", ["user_id"])

    # --- user_profile_changelog (append-only) ---
    op.create_table(
        "user_profile_changelog",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("action", sa.String(length=30), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column(
            "delta",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_profile_changelog_user_id", "user_profile_changelog", ["user_id"])
    op.create_index(
        "ix_user_profile_changelog_created_at", "user_profile_changelog", ["created_at"]
    )

    # --- workspace_memberships ---
    op.create_table(
        "workspace_memberships",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        # Org-level role
        sa.Column("org_role", sa.String(length=20), nullable=False, server_default="member"),
        # Per-module role assignments
        sa.Column(
            "module_roles",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        # Privacy toggles
        sa.Column("team_type_visible", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("drives_visible", sa.Boolean(), nullable=False, server_default="false"),
        # Soft locks
        sa.Column(
            "soft_locks",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        # Timestamps
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
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_memberships_ws_user"),
    )
    op.create_index(
        "ix_workspace_memberships_workspace_id", "workspace_memberships", ["workspace_id"]
    )
    op.create_index("ix_workspace_memberships_user_id", "workspace_memberships", ["user_id"])


def downgrade() -> None:
    # workspace_memberships
    op.drop_index("ix_workspace_memberships_user_id", table_name="workspace_memberships")
    op.drop_index("ix_workspace_memberships_workspace_id", table_name="workspace_memberships")
    op.drop_table("workspace_memberships")

    # user_profile_changelog
    op.drop_index("ix_user_profile_changelog_created_at", table_name="user_profile_changelog")
    op.drop_index("ix_user_profile_changelog_user_id", table_name="user_profile_changelog")
    op.drop_table("user_profile_changelog")

    # user_profiles
    op.drop_index("ix_user_profiles_user_id", table_name="user_profiles")
    op.drop_table("user_profiles")
