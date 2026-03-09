"""PlaybookInstance model — runtime state of a playbook execution.

Each playbook instance tracks:
- Which template it was created from
- Which vault it's attached to (1:1 per MAGS spec)
- Overall status (draft → running → completed/cancelled)
- Timestamps for lifecycle tracking
"""

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class PlaybookInstance(Base):
    __tablename__ = "playbook_instances"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)

    # Template reference (e.g., "contract-intake")
    template_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Vault attachment (1:1 per MAGS spec)
    vault_id: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)

    # Lifecycle status
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="draft")
    # Values: draft | running | paused | completed | cancelled

    # Flexible metadata
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}", nullable=False)

    # Timestamps
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
