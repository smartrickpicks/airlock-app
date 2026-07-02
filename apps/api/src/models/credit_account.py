from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class CreditAccount(Base):
    __tablename__ = "credit_accounts"
    __table_args__ = (UniqueConstraint("user_id", name="uq_credit_accounts_user_id"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id"), nullable=False)
    plan_id: Mapped[str] = mapped_column(Text, ForeignKey("credit_plans.id"), nullable=False)
    balance_cc: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    lifetime_earned_cc: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    lifetime_spent_cc: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    opus_calls_this_month: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    opus_cap_reset_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    openrouter_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
