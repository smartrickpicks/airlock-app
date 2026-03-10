"""Gate Manager — handles gate approval/rejection flows.

Gates are checkpoints in the DAG that require human review
before downstream nodes can proceed. Gate state is stored
in the node's `gate_response` JSONB field.

Gate types:
- verification: Verify data/output is correct (approve/reject)
- approval: Sign-off with optional comment (approve/reject)
- density: Quality threshold check (approve/request_changes)
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from src.schemas.playbook import GateConfig, GateType

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Gate response types
# ---------------------------------------------------------------------------


class GateAction(StrEnum):
    """Actions a gatekeeper can take."""

    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_CHANGES = "request_changes"


class GateResult:
    """Result of processing a gate response."""

    __slots__ = ("approved", "action", "response_data")

    def __init__(
        self,
        *,
        approved: bool,
        action: GateAction,
        response_data: dict[str, Any],
    ) -> None:
        self.approved = approved
        self.action = action
        self.response_data = response_data


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def process_gate_response(
    gate_config: GateConfig,
    *,
    action: str,
    responder_id: str,
    comment: str | None = None,
    existing_response: dict[str, Any] | None = None,
) -> GateResult:
    """Process a gate response from a human reviewer.

    Args:
        gate_config: The gate configuration from the template node
        action: The action taken (approve, reject, request_changes)
        responder_id: ID of the user responding
        comment: Optional comment from the reviewer
        existing_response: Any prior gate response data (for multi-approval)

    Returns:
        GateResult with approval status and structured response data
    """
    # Validate action
    try:
        gate_action = GateAction(action)
    except ValueError:
        msg = f"Invalid gate action: '{action}'. Must be one of: {', '.join(GateAction)}"
        raise ValueError(msg) from None

    # Validate gate type supports the action
    _validate_action_for_gate_type(gate_config.type, gate_action)

    now = datetime.now(UTC).isoformat()

    # Build response record
    response_entry = {
        "responder_id": responder_id,
        "action": gate_action.value,
        "comment": comment,
        "responded_at": now,
    }

    # Build cumulative response data
    response_data: dict[str, Any] = dict(existing_response) if existing_response else {}
    responses = list(response_data.get("responses", []))
    responses.append(response_entry)
    response_data["responses"] = responses
    response_data["last_action"] = gate_action.value
    response_data["last_responded_at"] = now

    # Check if approval threshold is met
    approvals = sum(1 for r in responses if r["action"] == GateAction.APPROVE)
    response_data["approval_count"] = approvals
    response_data["required_approvals"] = gate_config.required_approvals

    approved = False
    if gate_action == GateAction.APPROVE:
        approved = approvals >= gate_config.required_approvals
    elif gate_action == GateAction.REJECT:
        approved = False
        response_data["rejected"] = True
    elif gate_action == GateAction.REQUEST_CHANGES:
        approved = False
        response_data["changes_requested"] = True

    response_data["approved"] = approved

    return GateResult(
        approved=approved,
        action=gate_action,
        response_data=response_data,
    )


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------


GATE_ALLOWED_ACTIONS: dict[GateType, set[GateAction]] = {
    GateType.VERIFICATION: {GateAction.APPROVE, GateAction.REJECT},
    GateType.APPROVAL: {GateAction.APPROVE, GateAction.REJECT},
    GateType.DENSITY: {GateAction.APPROVE, GateAction.REQUEST_CHANGES},
}


def _validate_action_for_gate_type(gate_type: GateType, action: GateAction) -> None:
    """Validate that the action is allowed for this gate type."""
    allowed = GATE_ALLOWED_ACTIONS.get(gate_type, set(GateAction))
    if action not in allowed:
        msg = (
            f"Action '{action.value}' not allowed for gate type '{gate_type.value}'. "
            f"Allowed: {', '.join(a.value for a in allowed)}"
        )
        raise ValueError(msg)
