"""PlaybookNodeState model — per-node runtime state within a playbook instance.

Each node state tracks:
- Which instance and template node it corresponds to
- Execution status (pending → in_progress → completed/skipped/blocked)
- Who executed it (actor type) and which archetype was used
- Execution result and gate response data
"""

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class PlaybookNodeState(Base):
    __tablename__ = "playbook_node_states"

    id: Mapped[str] = mapped_column(Text, primary_key=True)

    # Parent instance
    instance_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)

    # RLS key (denormalized from instance for direct queries)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)

    # Template node reference (e.g., "triage", "compliance_review")
    node_id: Mapped[str] = mapped_column(String(100), nullable=False)

    # Execution status
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="pending")
    # Values: pending | in_progress | completed | skipped | blocked

    # Actor type (from template, but stored for audit)
    actor: Mapped[str] = mapped_column(String(20), nullable=False)
    # Values: otto | human | hybrid

    # Otto archetype used (if actor is otto or hybrid)
    archetype: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Execution result (JSONB — content produced by this node)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Gate response (if this node has a gate)
    gate_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # {approved: bool, approver_id: str, comment: str, responded_at: timestamp}

    # Flexible metadata
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}", nullable=False)

    # Timestamps
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
