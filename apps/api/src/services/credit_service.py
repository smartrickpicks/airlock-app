"""Constellation Credits — core business logic.

All credit mutations (spend, earn, allocate, pool contributions) go through
this service. Balance updates use SELECT ... FOR UPDATE to prevent races.
"""

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.credit_account import CreditAccount
from src.models.credit_plan import CreditPlan
from src.models.credit_pool import CreditPool, CreditPoolTransaction
from src.models.credit_transaction import CreditTransaction

logger = logging.getLogger(__name__)

GLOBAL_POOL_ID = "pool_global"


class InsufficientCreditsError(Exception):
    def __init__(self, balance: int, required: int):
        self.balance = balance
        self.required = required
        super().__init__(f"Insufficient credits: have {balance}, need {required}")


class OpusCapExceededError(Exception):
    def __init__(self, used: int, cap: int):
        self.used = used
        self.cap = cap
        super().__init__(f"Opus cap exceeded: used {used}/{cap} this month")


class FreeTierCapError(Exception):
    def __init__(self):
        super().__init__("Free tier cannot purchase overages")


class CreditService:
    def __init__(self, db: Session):
        self.db = db

    def get_plan(self, plan_id: str) -> CreditPlan:
        plan = self.db.get(CreditPlan, plan_id)
        if not plan:
            raise ValueError(f"Plan not found: {plan_id}")
        return plan

    def get_plan_by_name(self, name: str) -> CreditPlan:
        stmt = select(CreditPlan).where(CreditPlan.name == name)
        plan = self.db.execute(stmt).scalar_one_or_none()
        if not plan:
            raise ValueError(f"Plan not found: {name}")
        return plan

    def get_account(self, account_id: str) -> CreditAccount:
        account = self.db.get(CreditAccount, account_id)
        if not account:
            raise ValueError(f"Account not found: {account_id}")
        return account

    def get_account_by_user(self, user_id: str) -> CreditAccount | None:
        stmt = select(CreditAccount).where(CreditAccount.user_id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_or_create_account(self, user_id: str) -> CreditAccount:
        account = self.get_account_by_user(user_id)
        if account:
            return account

        account = CreditAccount(
            id=str(ULID()),
            user_id=user_id,
            plan_id="plan_free",
            balance_cc=0,
        )
        self.db.add(account)
        self.db.flush()
        return account

    def is_byok(self, account_id: str) -> bool:
        account = self.get_account(account_id)
        plan = self.get_plan(account.plan_id)
        return plan.is_byok

    def spend(
        self,
        account_id: str,
        amount_cc: int,
        source: str,
        model_tier: str | None = None,
        session_id: str | None = None,
    ) -> CreditTransaction:
        # Lock the account row to prevent race conditions
        stmt = select(CreditAccount).where(CreditAccount.id == account_id).with_for_update()
        account = self.db.execute(stmt).scalar_one()
        plan = self.get_plan(account.plan_id)

        # BYOK users don't spend credits
        if plan.is_byok:
            return self._record_transaction(
                account, -amount_cc, account.balance_cc, "spend", source, model_tier, session_id
            )

        # Check Opus cap
        if model_tier == "opus":
            if plan.opus_cap_monthly > 0 and account.opus_calls_this_month >= plan.opus_cap_monthly:
                raise OpusCapExceededError(account.opus_calls_this_month, plan.opus_cap_monthly)
            account.opus_calls_this_month += 1

        # Check balance
        if account.balance_cc < amount_cc:
            raise InsufficientCreditsError(account.balance_cc, amount_cc)

        account.balance_cc -= amount_cc
        account.lifetime_spent_cc += amount_cc
        account.updated_at = datetime.now(UTC)

        tx = self._record_transaction(
            account, -amount_cc, account.balance_cc, "spend", source, model_tier, session_id
        )
        self.db.flush()
        return tx

    def earn(
        self,
        account_id: str,
        amount_cc: int,
        source: str,
    ) -> CreditTransaction:
        stmt = select(CreditAccount).where(CreditAccount.id == account_id).with_for_update()
        account = self.db.execute(stmt).scalar_one()

        account.balance_cc += amount_cc
        account.lifetime_earned_cc += amount_cc
        account.updated_at = datetime.now(UTC)

        tx = self._record_transaction(account, amount_cc, account.balance_cc, "earn", source)
        self.db.flush()
        return tx

    def allocate_credits(self, account_id: str, amount_cc: int) -> None:
        """Direct credit allocation (admin/system use)."""
        stmt = select(CreditAccount).where(CreditAccount.id == account_id).with_for_update()
        account = self.db.execute(stmt).scalar_one()
        account.balance_cc += amount_cc
        account.lifetime_earned_cc += amount_cc
        account.updated_at = datetime.now(UTC)
        self.db.flush()

    def allocate_subscription_credits(self, account_id: str) -> None:
        """Monthly subscription credit allocation with pool split."""
        stmt = select(CreditAccount).where(CreditAccount.id == account_id).with_for_update()
        account = self.db.execute(stmt).scalar_one()
        plan = self.get_plan(account.plan_id)

        if plan.monthly_credits <= 0:
            return

        pool_pct = plan.pool_split_pct / 100
        pool_amount = int(plan.monthly_credits * pool_pct)
        user_amount = plan.monthly_credits - pool_amount

        # Credit user's balance
        account.balance_cc += user_amount
        account.lifetime_earned_cc += user_amount
        account.updated_at = datetime.now(UTC)

        self._record_transaction(account, user_amount, account.balance_cc, "subscription", "stripe")

        # Contribute to pool
        if pool_amount > 0:
            self._contribute_to_pool(pool_amount, account_id)

        # Reset Opus counter
        account.opus_calls_this_month = 0
        account.opus_cap_reset_at = datetime.now(UTC)

        self.db.flush()

    def upgrade_plan(self, account_id: str, plan_id: str) -> None:
        account = self.get_account(account_id)
        plan = self.get_plan(plan_id)
        account.plan_id = plan.id
        account.updated_at = datetime.now(UTC)
        self.db.flush()

    def purchase_overage(self, account_id: str, amount_cc: int) -> CreditTransaction:
        account = self.get_account(account_id)
        plan = self.get_plan(account.plan_id)

        if plan.name == "free":
            raise FreeTierCapError()

        # Overage credits go directly to balance (no pool split)
        stmt = select(CreditAccount).where(CreditAccount.id == account_id).with_for_update()
        account = self.db.execute(stmt).scalar_one()
        account.balance_cc += amount_cc
        account.lifetime_earned_cc += amount_cc
        account.updated_at = datetime.now(UTC)

        tx = self._record_transaction(account, amount_cc, account.balance_cc, "overage", "stripe")
        self.db.flush()
        return tx

    def get_transactions(
        self, account_id: str, limit: int = 50, offset: int = 0
    ) -> list[CreditTransaction]:
        stmt = (
            select(CreditTransaction)
            .where(CreditTransaction.account_id == account_id)
            .order_by(CreditTransaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().all())

    def _record_transaction(
        self,
        account: CreditAccount,
        amount_cc: int,
        balance_after: int,
        tx_type: str,
        source: str,
        model_tier: str | None = None,
        session_id: str | None = None,
    ) -> CreditTransaction:
        tx = CreditTransaction(
            id=str(ULID()),
            account_id=account.id,
            amount_cc=amount_cc,
            balance_after=balance_after,
            type=tx_type,
            source=source,
            model_tier=model_tier,
            session_id=session_id,
        )
        self.db.add(tx)
        return tx

    def _contribute_to_pool(self, amount_cc: int, source_account_id: str) -> None:
        stmt = select(CreditPool).where(CreditPool.id == GLOBAL_POOL_ID).with_for_update()
        pool = self.db.execute(stmt).scalar_one_or_none()
        if not pool:
            logger.warning("Global pool not found, skipping contribution")
            return

        pool.balance_cc += amount_cc
        pool.total_contributed_cc += amount_cc
        pool.updated_at = datetime.now(UTC)

        pool_tx = CreditPoolTransaction(
            id=str(ULID()),
            pool_id=pool.id,
            amount_cc=amount_cc,
            balance_after=pool.balance_cc,
            type="contribution",
            source_account_id=source_account_id,
        )
        self.db.add(pool_tx)
