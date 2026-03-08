"""Rule-based chamber transitions for intake-driven contract vaults."""

from __future__ import annotations

from enum import StrEnum

from sqlalchemy.orm import Session

from src.services.document import list_documents


class TransitionResult(StrEnum):
    ALLOWED = "allowed"
    BLOCKED = "blocked"
    AUTO = "auto"


def check_discover_to_build(
    db: Session,
    vault,
    workspace_id: str,
) -> tuple[TransitionResult, list[str]]:
    """Discover -> Build depends on a parsed document and preflight result."""
    reasons: list[str] = []
    documents = list_documents(db, workspace_id, vault_id=vault.id, limit=10)
    if not documents:
        reasons.append("No document uploaded")
    elif not any(document.status == "parsed" for document in documents):
        reasons.append("Document not yet parsed")

    metadata = vault.metadata_ or {}
    preflight_result = metadata.get("preflight_result")
    if not preflight_result:
        reasons.append("Preflight not yet run")

    if reasons:
        return TransitionResult.BLOCKED, reasons

    gate_color = str(preflight_result.get("gate_color", "")).upper()
    if gate_color == "RED":
        reasons.extend(
            [str(reason) for reason in preflight_result.get("gate_reasons", []) if str(reason)]
            or ["Preflight gate is RED"]
        )
        return TransitionResult.BLOCKED, reasons
    if gate_color == "GREEN":
        return TransitionResult.AUTO, []
    return TransitionResult.ALLOWED, []


def check_build_to_review(
    db: Session,
    vault,
    workspace_id: str,
) -> tuple[TransitionResult, list[str]]:
    """Build -> Review requires preflight, extraction, and no unresolved entities."""
    del db, workspace_id
    reasons: list[str] = []
    metadata = vault.metadata_ or {}
    preflight_result = metadata.get("preflight_result")
    extraction_result = metadata.get("extraction_result")

    if not preflight_result:
        reasons.append("Preflight not complete")
    if not extraction_result:
        reasons.append("Extraction not complete")

    entity_resolution = {}
    if isinstance(preflight_result, dict):
        raw_entity_resolution = preflight_result.get("entity_resolution")
        if isinstance(raw_entity_resolution, dict):
            entity_resolution = raw_entity_resolution

    unresolved_count = entity_resolution.get("unresolved_count", 0)
    if isinstance(unresolved_count, int) and unresolved_count > 0:
        reasons.append(f"{unresolved_count} unresolved entities")

    if reasons:
        return TransitionResult.BLOCKED, reasons
    return TransitionResult.ALLOWED, []


def check_review_to_ship(
    db: Session,
    vault,
    workspace_id: str,
) -> tuple[TransitionResult, list[str]]:
    """Review -> Ship requires both gatekeeper and owner approvals."""
    del db, workspace_id
    reasons: list[str] = []
    metadata = vault.metadata_ or {}
    approvals = metadata.get("approvals", {})
    if not isinstance(approvals, dict):
        approvals = {}

    if not approvals.get("gatekeeper_approved"):
        reasons.append("Gatekeeper approval required")
    if not approvals.get("owner_approved"):
        reasons.append("Owner approval required")

    if reasons:
        return TransitionResult.BLOCKED, reasons
    return TransitionResult.ALLOWED, []
