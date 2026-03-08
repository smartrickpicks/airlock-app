"""Patch service — CRUD and state-machine transitions for field corrections."""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.patch import Patch

# Valid transitions: (from_status, action) -> to_status
TRANSITIONS: dict[tuple[str, str], str] = {
    # Author actions
    ("draft", "submit"): "submitted",
    ("draft", "cancel"): "cancelled",
    ("needs_clarification", "respond"): "verifier_responded",
    ("needs_clarification", "cancel"): "cancelled",
    ("otto_returned", "submit"): "submitted",
    ("otto_returned", "cancel"): "cancelled",
    # Verifier actions
    ("submitted", "approve"): "verifier_approved",
    ("submitted", "clarify"): "needs_clarification",
    ("submitted", "reject"): "rejected",
    ("verifier_responded", "approve"): "verifier_approved",
    ("verifier_responded", "clarify"): "needs_clarification",
    ("verifier_responded", "reject"): "rejected",
    # Admin actions
    ("verifier_approved", "approve"): "admin_approved",
    ("verifier_approved", "hold"): "admin_hold",
    ("verifier_approved", "reject"): "rejected",
    ("admin_hold", "approve"): "admin_approved",
    ("admin_hold", "reject"): "rejected",
    # System actions
    ("admin_approved", "apply"): "applied",
    ("admin_approved", "send_to_otto"): "sent_to_otto",
    ("sent_to_otto", "otto_return"): "otto_returned",
}

# Actions that require the actor NOT to be the patch author
APPROVAL_ACTIONS = {"approve", "clarify", "reject", "hold"}


def create_patch(
    db: Session,
    *,
    vault_id: str,
    workspace_id: str,
    field_key: str,
    old_value: str | None,
    new_value: str,
    submitted_by: str | None = None,
    evidence: dict | None = None,
    metadata: dict | None = None,
) -> Patch:
    """Create a new patch in draft status."""
    patch = Patch(
        id=str(ULID()),
        vault_id=vault_id,
        workspace_id=workspace_id,
        field_key=field_key,
        old_value=old_value,
        new_value=new_value,
        status="draft",
        submitted_by=submitted_by,
        version=1,
        evidence=evidence or {},
        history=[],
        metadata_=metadata or {},
    )
    db.add(patch)
    db.commit()
    db.refresh(patch)
    return patch


def transition_patch(
    db: Session,
    patch: Patch,
    *,
    action: str,
    actor_id: str,
    expected_version: int,
    note: str | None = None,
) -> Patch:
    """Advance a patch through its state machine.

    Raises ValueError for invalid transitions, self-approval, or version conflicts.
    """
    # Optimistic lock
    if patch.version != expected_version:
        raise ValueError(f"Version conflict: expected {expected_version}, got {patch.version}")

    # Self-approval prevention
    if action in APPROVAL_ACTIONS and actor_id == patch.submitted_by:
        raise ValueError("Cannot approve/review your own patch")

    # Validate transition
    key = (patch.status, action)
    next_status = TRANSITIONS.get(key)
    if next_status is None:
        raise ValueError(f"Invalid transition: cannot '{action}' from status '{patch.status}'")

    # Record in history
    history_entry = {
        "from": patch.status,
        "to": next_status,
        "action": action,
        "actor_id": actor_id,
        "timestamp": datetime.now(UTC).isoformat(),
    }
    if note:
        history_entry["note"] = note

    new_history = list(patch.history or [])
    new_history.append(history_entry)
    patch.history = new_history

    # Update state
    patch.status = next_status
    patch.version += 1

    if action in APPROVAL_ACTIONS:
        patch.reviewed_by = actor_id

    db.commit()
    db.refresh(patch)
    return patch


def get_patch(db: Session, patch_id: str, workspace_id: str) -> Patch | None:
    """Get a single patch by ID within a workspace."""
    stmt = select(Patch).where(
        Patch.id == patch_id,
        Patch.workspace_id == workspace_id,
        Patch.deleted_at.is_(None),
    )
    return db.execute(stmt).scalar_one_or_none()


def list_patches_for_vault(
    db: Session,
    vault_id: str,
    workspace_id: str,
    *,
    limit: int = 50,
    offset: int = 0,
) -> list[Patch]:
    """List patches for a vault, newest first."""
    stmt = (
        select(Patch)
        .where(
            Patch.vault_id == vault_id,
            Patch.workspace_id == workspace_id,
            Patch.deleted_at.is_(None),
        )
        .order_by(Patch.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.execute(stmt).scalars().all())
