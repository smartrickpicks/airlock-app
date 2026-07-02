"""Patch model — structured field corrections with approval workflow."""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class Patch(Base):
    __tablename__ = "patches"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    vault_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)

    # Field being patched
    field_key: Mapped[str] = mapped_column(String(255), nullable=False)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str] = mapped_column(Text, nullable=False)

    # State machine
    status: Mapped[str] = mapped_column(String(30), nullable=False, server_default="draft")

    # Actors
    submitted_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Optimistic locking
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")

    # Structured evidence
    evidence: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)

    # Append-only state transition log
    history: Mapped[list] = mapped_column(JSONB, server_default="[]", nullable=False)

    # Flexible metadata
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}", nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
