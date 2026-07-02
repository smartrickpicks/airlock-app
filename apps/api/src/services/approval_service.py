"""Approval service — manage vault gate approvals stored in vault metadata."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from src.services.vault import get_vault


def record_approval(
    db: Session,
    vault_id: str,
    user_id: str,
    role: str,
    workspace_id: str,
) -> dict:
    """Record an approval for a vault. Only gatekeeper and owner roles are valid.

    Stores approval in vault metadata.approvals as:
        {role}_approved: True
        {role}_approved_by: user_id
        {role}_approved_at: ISO timestamp

    Returns the updated approval state dict.
    Raises ValueError if role is not gatekeeper or owner.
    Raises LookupError if vault not found.
    """
    if role not in ("gatekeeper", "owner"):
        raise ValueError(f"Only gatekeeper and owner roles can approve; got '{role}'")

    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise LookupError("Vault not found")

    metadata = dict(vault.metadata_ or {})
    approvals = dict(metadata.get("approvals", {}))

    now = datetime.now(UTC).isoformat()
    approvals[f"{role}_approved"] = True
    approvals[f"{role}_approved_by"] = user_id
    approvals[f"{role}_approved_at"] = now

    metadata["approvals"] = approvals
    vault.metadata_ = metadata

    db.commit()
    db.refresh(vault)

    return approvals


def get_approval_state(
    db: Session,
    vault_id: str,
    workspace_id: str,
) -> dict:
    """Return the current approval state for a vault.

    Returns a dict with gatekeeper_approved, owner_approved booleans
    and optional _by / _at fields.
    Raises LookupError if vault not found.
    """
    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise LookupError("Vault not found")

    metadata = vault.metadata_ or {}
    approvals = metadata.get("approvals", {})
    if not isinstance(approvals, dict):
        approvals = {}

    return {
        "gatekeeper_approved": bool(approvals.get("gatekeeper_approved", False)),
        "gatekeeper_approved_by": approvals.get("gatekeeper_approved_by"),
        "gatekeeper_approved_at": approvals.get("gatekeeper_approved_at"),
        "owner_approved": bool(approvals.get("owner_approved", False)),
        "owner_approved_by": approvals.get("owner_approved_by"),
        "owner_approved_at": approvals.get("owner_approved_at"),
    }


def reset_approvals(
    db: Session,
    vault_id: str,
    workspace_id: str,
) -> None:
    """Clear all approval fields from a vault's metadata.

    Called when a vault moves backward or a patch is applied in review.
    Raises LookupError if vault not found.
    """
    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise LookupError("Vault not found")

    metadata = dict(vault.metadata_ or {})
    metadata.pop("approvals", None)
    vault.metadata_ = metadata

    db.commit()
    db.refresh(vault)
