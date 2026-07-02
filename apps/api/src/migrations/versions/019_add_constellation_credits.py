"""add constellation credits schema

Revision ID: 019
Revises: 018
Create Date: 2026-03-11

Creates the 5-table constellation credits schema:
  credit_plans, credit_accounts, credit_transactions,
  credit_pool, credit_pool_transactions.

Seeds 4 default plans (free, plus, constellation, byok_pro)
and 1 global Brain Brigade pool.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "019"
down_revision: str = "018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # credit_plans — tier definitions                                      #
    # ------------------------------------------------------------------ #
    op.create_table(
        "credit_plans",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("monthly_credits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("opus_cap_monthly", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overage_price_cents_per_cc", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("pool_split_pct", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("is_byok", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("name", name="uq_credit_plans_name"),
    )

    # ------------------------------------------------------------------ #
    # credit_accounts — one per user, portable across workspaces          #
    # ------------------------------------------------------------------ #
    op.create_table(
        "credit_accounts",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Text(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "plan_id",
            sa.Text(),
            sa.ForeignKey("credit_plans.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("balance_cc", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("lifetime_earned_cc", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("lifetime_spent_cc", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("opus_calls_this_month", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("opus_cap_reset_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stripe_customer_id", sa.Text(), nullable=True),
        sa.Column("stripe_subscription_id", sa.Text(), nullable=True),
        sa.Column("openrouter_key_encrypted", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", name="uq_credit_accounts_user_id"),
    )
    op.create_index("idx_credit_accounts_user_id", "credit_accounts", ["user_id"])

    # ------------------------------------------------------------------ #
    # credit_transactions — immutable ledger                              #
    # ------------------------------------------------------------------ #
    op.create_table(
        "credit_transactions",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "account_id",
            sa.Text(),
            sa.ForeignKey("credit_accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount_cc", sa.Integer(), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("model_tier", sa.Text(), nullable=True),
        sa.Column("session_id", sa.Text(), nullable=True),
        sa.Column("metadata_", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_credit_transactions_account_created",
        "credit_transactions",
        ["account_id", "created_at"],
    )
    op.create_index(
        "idx_credit_transactions_type_created",
        "credit_transactions",
        ["type", "created_at"],
    )

    # ------------------------------------------------------------------ #
    # credit_pool — community pool                                        #
    # ------------------------------------------------------------------ #
    op.create_table(
        "credit_pool",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("workspace_id", sa.Text(), nullable=True),
        sa.Column("balance_cc", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_contributed_cc", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_spent_cc", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # ------------------------------------------------------------------ #
    # credit_pool_transactions — immutable pool ledger                    #
    # ------------------------------------------------------------------ #
    op.create_table(
        "credit_pool_transactions",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "pool_id",
            sa.Text(),
            sa.ForeignKey("credit_pool.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount_cc", sa.Integer(), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("source_account_id", sa.Text(), nullable=True),
        sa.Column("metadata_", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_credit_pool_transactions_pool_created",
        "credit_pool_transactions",
        ["pool_id", "created_at"],
    )

    # ------------------------------------------------------------------ #
    # Seed data                                                           #
    # ------------------------------------------------------------------ #
    op.execute(
        """
        INSERT INTO credit_plans
            (id, name, price_cents, monthly_credits, opus_cap_monthly,
             overage_price_cents_per_cc, pool_split_pct, is_byok)
        VALUES
            ('plan_free',         'free',         0,    50,    0,   0, 0,   false),
            ('plan_plus',         'plus',       999,   500,   30,   2, 30,  false),
            ('plan_constellation','constellation',2499, 2000, 150,  2, 30,  false),
            ('plan_byok_pro',     'byok_pro',   999,     0,   0,   0, 100, true)
        """
    )

    op.execute(
        """
        INSERT INTO credit_pool
            (id, workspace_id, balance_cc, total_contributed_cc, total_spent_cc)
        VALUES
            ('pool_global', NULL, 0, 0, 0)
        """
    )


def downgrade() -> None:
    op.drop_index(
        "idx_credit_pool_transactions_pool_created", table_name="credit_pool_transactions"
    )
    op.drop_table("credit_pool_transactions")
    op.drop_table("credit_pool")
    op.drop_index("idx_credit_transactions_type_created", table_name="credit_transactions")
    op.drop_index("idx_credit_transactions_account_created", table_name="credit_transactions")
    op.drop_table("credit_transactions")
    op.drop_index("idx_credit_accounts_user_id", table_name="credit_accounts")
    op.drop_table("credit_accounts")
    op.drop_table("credit_plans")
