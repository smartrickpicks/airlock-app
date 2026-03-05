"""Vault model — hierarchical work container (4-level tree)."""

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class Vault(Base):
    __tablename__ = "vaults"
    __table_args__ = (
        UniqueConstraint("workspace_id", "slug", name="uq_vaults_workspace_slug"),
        CheckConstraint("vault_level BETWEEN 1 AND 4", name="ck_vaults_level_range"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)

    # Hierarchy
    parent_vault_id: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    vault_level: Mapped[int] = mapped_column(Integer, nullable=False, default=4)

    # Identity
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    vault_type: Mapped[str] = mapped_column(String(50), nullable=False)
    module_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # State (item vaults only — NULL for levels 1-3)
    chamber: Mapped[str | None] = mapped_column(String(20), nullable=True, default="discover")
    gate: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Metrics
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}", nullable=False)
    health_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
