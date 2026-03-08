"""Otto AI session and message models."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class OttoSession(Base):
    __tablename__ = "otto_sessions"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    vault_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    model_used: Mapped[str | None] = mapped_column(Text, nullable=True)
    enrichment_snapshot: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    tool_calls_count: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    total_tokens: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(10, 6), server_default="0", nullable=False)
    message_count: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class OttoMessage(Base):
    __tablename__ = "otto_messages"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    session_id: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tool_calls: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tool_results: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tool_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    model: Mapped[str | None] = mapped_column(Text, nullable=True)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 6), nullable=True)
    enrichment_sources_used: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    finish_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
