"""fix workspace_config constraints

Revision ID: 015
Revises: 014
Create Date: 2026-03-10

Adds:
- FK workspace_config.workspace_id → workspaces.id (CASCADE)
- updated_at trigger
- CHECK constraint on ai_tier
- CHECK constraint on billing_tier
"""

from collections.abc import Sequence

from alembic import op

revision: str = "015"
down_revision: str = "014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # H2: Foreign key to workspaces
    op.create_foreign_key(
        "fk_workspace_config_workspace_id",
        "workspace_config",
        "workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # H3: updated_at trigger
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)
    op.execute("""
        CREATE TRIGGER trg_workspace_config_updated_at
        BEFORE UPDATE ON workspace_config
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)

    # M2: CHECK constraint on ai_tier
    op.create_check_constraint(
        "ck_workspace_config_ai_tier",
        "workspace_config",
        "ai_tier IN ('none', 'byok', 'managed')",
    )

    # M3: CHECK constraint on billing_tier
    op.create_check_constraint(
        "ck_workspace_config_billing_tier",
        "workspace_config",
        "billing_tier IN ('beta', 'starter', 'team', 'enterprise')",
    )


def downgrade() -> None:
    # Drop CHECK constraints
    op.drop_constraint(
        "ck_workspace_config_billing_tier",
        "workspace_config",
        type_="check",
    )
    op.drop_constraint(
        "ck_workspace_config_ai_tier",
        "workspace_config",
        type_="check",
    )

    # Drop trigger and function
    op.execute("DROP TRIGGER IF EXISTS trg_workspace_config_updated_at ON workspace_config;")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column();")

    # Drop foreign key
    op.drop_constraint(
        "fk_workspace_config_workspace_id",
        "workspace_config",
        type_="foreignkey",
    )
