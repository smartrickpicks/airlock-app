from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class CreditPlan(Base):
    __tablename__ = "credit_plans"
    __table_args__ = (UniqueConstraint("name", name="uq_credit_plans_name"),)

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    monthly_credits: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    opus_cap_monthly: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    overage_price_cents_per_cc: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    pool_split_pct: Mapped[int] = mapped_column(Integer, nullable=False, server_default="30")
    is_byok: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
