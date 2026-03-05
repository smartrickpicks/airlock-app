"""Event model — append-only audit trail for vault actions."""

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    vault_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
