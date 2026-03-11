"""Circuit breakers for Constellation Credit economy.

Protects the community pool from drainage by:
1. Pausing free tier when pool health is critical
2. Limiting free tier to 10 interactions/day per user
3. Triggering alerts when daily spend exceeds projections
"""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.credit_transaction import CreditTransaction
from src.services.pool_service import GLOBAL_POOL_ID, PoolService

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CircuitCheck:
    allowed: bool
    reason: str = ""
    message: str = ""


class CircuitBreaker:
    FREE_DAILY_INTERACTION_CAP = 10
    DAILY_SPEND_ALERT_MULTIPLIER = 2.0

    def __init__(self, db: Session):
        self.db = db
        self.pool_service = PoolService(db=db)

    def check_access(self, user_tier: str, user_id: str | None = None) -> CircuitCheck:
        """Check if a user is allowed to make an Otto interaction.

        Paid users always pass. Free users are subject to pool health
        and daily interaction caps.
        """
        # Paid tiers always allowed
        if user_tier in ("plus", "constellation", "byok_pro"):
            return CircuitCheck(allowed=True)

        # Free tier: check pool health
        pool_health = self.pool_service.get_health(GLOBAL_POOL_ID)
        if pool_health == "critical":
            return CircuitCheck(
                allowed=False,
                reason="pool_critical",
                message="Otto is at capacity. The community pool is low. Upgrade to Plus for uninterrupted access.",
            )

        # Free tier: check daily interaction limit
        if user_id:
            daily_count = self._get_daily_interaction_count(user_id)
            if daily_count >= self.FREE_DAILY_INTERACTION_CAP:
                return CircuitCheck(
                    allowed=False,
                    reason="daily_limit",
                    message=f"You've used all {self.FREE_DAILY_INTERACTION_CAP} free interactions today. Resets at midnight UTC.",
                )

        # Free tier: check daily spend spike
        if self._is_daily_spend_spiking():
            return CircuitCheck(
                allowed=False,
                reason="spend_spike",
                message="Otto is experiencing high demand. Free tier is temporarily paused. Try again later or upgrade to Plus.",
            )

        return CircuitCheck(allowed=True)

    def record_interaction(self, user_id: str) -> None:
        """Record a free-tier interaction for daily cap tracking.

        Uses credit_transactions table — each spend transaction
        with source='otto_chat' counts as one interaction.
        No separate tracking table needed.
        """
        # Interactions are already tracked via CreditService.spend()
        # This method exists for explicit tracking if needed later
        pass

    def _get_daily_interaction_count(self, user_id: str) -> int:
        """Count interactions today for a user (via credit transactions)."""
        since = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        stmt = (
            select(func.count())
            .select_from(CreditTransaction)
            .where(
                CreditTransaction.source == "otto_chat",
                CreditTransaction.created_at >= since,
                CreditTransaction.type == "spend",
            )
        )
        # Join through credit_account to filter by user_id
        # For now, count all transactions from this user's accounts
        from src.models.credit_account import CreditAccount

        stmt = (
            select(func.count())
            .select_from(CreditTransaction)
            .join(CreditAccount, CreditTransaction.account_id == CreditAccount.id)
            .where(
                CreditAccount.user_id == user_id,
                CreditTransaction.source == "otto_chat",
                CreditTransaction.type == "spend",
                CreditTransaction.created_at >= since,
            )
        )
        result = self.db.execute(stmt).scalar()
        return int(result) if result else 0

    def _is_daily_spend_spiking(self) -> bool:
        """Check if today's spend is > 2x the 7-day daily average."""
        now = datetime.now(UTC)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today_start - timedelta(days=7)

        # Today's total spend (CC)
        today_stmt = select(
            func.coalesce(func.sum(func.abs(CreditTransaction.amount_cc)), 0)
        ).where(
            CreditTransaction.type == "spend",
            CreditTransaction.created_at >= today_start,
        )
        today_spend = int(self.db.execute(today_stmt).scalar() or 0)

        # 7-day average daily spend
        week_stmt = select(func.coalesce(func.sum(func.abs(CreditTransaction.amount_cc)), 0)).where(
            CreditTransaction.type == "spend",
            CreditTransaction.created_at >= week_ago,
            CreditTransaction.created_at < today_start,
        )
        week_spend = int(self.db.execute(week_stmt).scalar() or 0)
        avg_daily = week_spend / 7 if week_spend > 0 else 0

        if avg_daily <= 0:
            return False

        return today_spend > (avg_daily * self.DAILY_SPEND_ALERT_MULTIPLIER)
