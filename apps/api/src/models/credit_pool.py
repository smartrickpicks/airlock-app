from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class CreditPool(Base):
    __tablename__ = "credit_pool"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    workspace_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    balance_cc: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_contributed_cc: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_spent_cc: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CreditPoolTransaction(Base):
    __tablename__ = "credit_pool_transactions"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    pool_id: Mapped[str] = mapped_column(Text, ForeignKey("credit_pool.id"), nullable=False)
    amount_cc: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    source_account_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_: Mapped[str | None] = mapped_column("metadata_", Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
