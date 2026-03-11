"""Community pool management for Constellation Credits."""

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.credit_pool import CreditPool, CreditPoolTransaction

logger = logging.getLogger(__name__)

GLOBAL_POOL_ID = "pool_global"

# Free tier costs ~$0.21/mo = ~21 CC/mo per user
# At 10 interactions/day cap = ~50 CC/mo max
FREE_TIER_WEEKLY_BURN_PER_USER = 12  # CC


class PoolService:
    def __init__(self, db: Session):
        self.db = db

    def get_pool(self, pool_id: str = GLOBAL_POOL_ID) -> CreditPool | None:
        return self.db.get(CreditPool, pool_id)

    def get_stats(self, pool_id: str = GLOBAL_POOL_ID) -> dict:
        pool = self.get_pool(pool_id)
        if not pool:
            return {
                "balance_cc": 0,
                "total_contributed_cc": 0,
                "total_spent_cc": 0,
                "daily_spend_cc": self._get_daily_spend(pool_id),
                "free_tier_subsidy_cc": self._get_free_tier_subsidy(pool_id),
                "top_contributors": [],
                "health": "healthy",
            }

        return {
            "balance_cc": pool.balance_cc,
            "total_contributed_cc": pool.total_contributed_cc,
            "total_spent_cc": pool.total_spent_cc,
            "daily_spend_cc": self._get_daily_spend(pool_id),
            "free_tier_subsidy_cc": self._get_free_tier_subsidy(pool_id),
            "top_contributors": self._get_top_contributors(pool_id, limit=10),
            "health": self._calculate_health(pool),
        }

    def get_health(self, pool_id: str = GLOBAL_POOL_ID) -> str:
        pool = self.get_pool(pool_id)
        if not pool:
            return "healthy"
        return self._calculate_health(pool)

    def get_health_details(self, pool_id: str = GLOBAL_POOL_ID) -> dict:
        pool = self.get_pool(pool_id)
        health = self._calculate_health(pool) if pool else "healthy"
        weekly_burn = self._get_weekly_burn(pool_id)
        balance = pool.balance_cc if pool else 0
        weeks_remaining = balance / weekly_burn if weekly_burn > 0 else float("inf")

        return {
            "health": health,
            "free_signups_open": health != "critical",
            "balance_weeks_remaining": round(weeks_remaining, 1),
        }

    def get_transactions(
        self, pool_id: str = GLOBAL_POOL_ID, limit: int = 50
    ) -> list[CreditPoolTransaction]:
        stmt = (
            select(CreditPoolTransaction)
            .where(CreditPoolTransaction.pool_id == pool_id)
            .order_by(CreditPoolTransaction.created_at.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def _calculate_health(self, pool: CreditPool) -> str:
        weekly_burn = self._get_weekly_burn(pool.id)
        if weekly_burn <= 0:
            return "healthy"

        weeks_remaining = pool.balance_cc / weekly_burn
        if weeks_remaining < 1:
            return "critical"
        if weeks_remaining < 4:
            return "low"
        return "healthy"

    def _get_daily_spend(self, pool_id: str) -> int:
        since = datetime.now(UTC) - timedelta(days=1)
        stmt = select(func.coalesce(func.sum(func.abs(CreditPoolTransaction.amount_cc)), 0)).where(
            CreditPoolTransaction.pool_id == pool_id,
            CreditPoolTransaction.amount_cc < 0,
            CreditPoolTransaction.created_at >= since,
        )
        result = self.db.execute(stmt).scalar()
        return int(result) if result else 0

    def _get_weekly_burn(self, pool_id: str) -> int:
        since = datetime.now(UTC) - timedelta(days=7)
        stmt = select(func.coalesce(func.sum(func.abs(CreditPoolTransaction.amount_cc)), 0)).where(
            CreditPoolTransaction.pool_id == pool_id,
            CreditPoolTransaction.amount_cc < 0,
            CreditPoolTransaction.created_at >= since,
        )
        result = self.db.execute(stmt).scalar()
        return int(result) if result else 0

    def _get_free_tier_subsidy(self, pool_id: str) -> int:
        since = datetime.now(UTC) - timedelta(days=30)
        stmt = select(func.coalesce(func.sum(func.abs(CreditPoolTransaction.amount_cc)), 0)).where(
            CreditPoolTransaction.pool_id == pool_id,
            CreditPoolTransaction.type == "free_tier_subsidy",
            CreditPoolTransaction.created_at >= since,
        )
        result = self.db.execute(stmt).scalar()
        return int(result) if result else 0

    def _get_top_contributors(self, pool_id: str, limit: int = 10) -> list[dict]:
        stmt = (
            select(
                CreditPoolTransaction.source_account_id,
                func.sum(CreditPoolTransaction.amount_cc).label("total"),
            )
            .where(
                CreditPoolTransaction.pool_id == pool_id,
                CreditPoolTransaction.amount_cc > 0,
                CreditPoolTransaction.source_account_id.isnot(None),
            )
            .group_by(CreditPoolTransaction.source_account_id)
            .order_by(func.sum(CreditPoolTransaction.amount_cc).desc())
            .limit(limit)
        )
        rows = self.db.execute(stmt).all()
        return [
            {"account_id": row.source_account_id, "contributed_cc": int(row.total)} for row in rows
        ]
