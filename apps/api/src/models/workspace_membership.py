"""WorkspaceMembership model — user membership in a workspace with org role and privacy.

Per MAGS Phase 1 spec:
- workspace_id is the RLS key for tenant isolation
- org_role: architect, controller, member, guest (org-level hierarchy)
- module_roles: per-module role assignments {contracts: "owner", crm: "builder"}
- Privacy toggles: team_type_visible, drives_visible
- soft_locks: prevent profile changes during active playbooks
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class WorkspaceMembership(Base):
    __tablename__ = "workspace_memberships"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)

    # Org-level role within this workspace
    org_role: Mapped[str] = mapped_column(String(20), nullable=False, server_default="member")
    # "architect", "controller", "member", "guest"

    # Per-module role assignments
    module_roles: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    # {contracts: "owner", crm: "builder", triage: "gatekeeper", ...}

    # Privacy — what teammates can see
    team_type_visible: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    drives_visible: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)

    # Soft locks — prevent re-inference during active playbooks
    soft_locks: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    # {locked: false, locked_by: null, locked_until: null, reason: null}

    # Standard timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
