"""Node Executor — routes execution to actor-specific handlers.

For each actor type:
- otto:   Compose Otto prompt and generate a response (stub for dogfood, Claude in M25)
- human:  Mark as blocked, awaiting external completion
- hybrid: Otto drafts (stored in result), then marks gate-waiting for human confirmation
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from src.schemas.playbook import ActorType, NodeStatus, PlaybookNode

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Node execution result
# ---------------------------------------------------------------------------


class NodeExecutionResult:
    """Result of executing a single node."""

    __slots__ = ("status", "result", "gate_pending")

    def __init__(
        self,
        status: NodeStatus,
        result: dict[str, Any] | None = None,
        *,
        gate_pending: bool = False,
    ) -> None:
        self.status = status
        self.result = result
        self.gate_pending = gate_pending


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def execute_node(
    node: PlaybookNode,
    *,
    instance_id: str,
    vault_context: dict[str, Any] | None = None,
    user_profile: dict[str, Any] | None = None,
) -> NodeExecutionResult:
    """Execute a node based on its actor type.

    Returns a NodeExecutionResult indicating the new status and any
    produced result data.
    """
    if node.actor == ActorType.OTTO:
        return _execute_otto(node, vault_context=vault_context, user_profile=user_profile)
    elif node.actor == ActorType.HUMAN:
        return _execute_human(node)
    elif node.actor == ActorType.HYBRID:
        return _execute_hybrid(node, vault_context=vault_context, user_profile=user_profile)
    else:
        logger.error("Unknown actor type '%s' for node '%s'", node.actor, node.id)
        return NodeExecutionResult(status=NodeStatus.BLOCKED)


# ---------------------------------------------------------------------------
# Actor-specific handlers
# ---------------------------------------------------------------------------


def _execute_otto(
    node: PlaybookNode,
    *,
    vault_context: dict[str, Any] | None = None,
    user_profile: dict[str, Any] | None = None,
) -> NodeExecutionResult:
    """Execute an Otto (AI) node.

    In dogfood mode, produces a structured stub response.
    TODO(M25): Replace stub with real Claude API call via prompt_composer.
    """
    # Build the prompt (validates the composition pipeline works)
    prompt_context = _build_prompt_context(
        node, vault_context=vault_context, user_profile=user_profile
    )

    # Stub response — structured output that downstream consumers can use
    result = {
        "type": "otto_execution",
        "node_id": node.id,
        "node_name": node.name,
        "archetype": node.otto_archetype or "executor",
        "chamber": node.chamber,
        "prompt_context": prompt_context,
        "output": f"[Otto/{node.otto_archetype or 'executor'}] Completed: {node.description}",
        "completed_at": datetime.now(UTC).isoformat(),
        "stub": True,  # Flag for consumers to know this is not a real LLM response
    }

    # If node has a gate, Otto completes but gate needs approval
    if node.gate is not None:
        return NodeExecutionResult(
            status=NodeStatus.COMPLETED,
            result=result,
            gate_pending=True,
        )

    return NodeExecutionResult(status=NodeStatus.COMPLETED, result=result)


def _execute_human(node: PlaybookNode) -> NodeExecutionResult:
    """Execute a human node — mark as blocked, awaiting external action.

    Human nodes require an external call to /nodes/{node_id}/complete
    to transition out of BLOCKED status.
    """
    result = {
        "type": "human_task",
        "node_id": node.id,
        "node_name": node.name,
        "description": node.description,
        "awaiting": "human_completion",
    }

    # If node also has a gate, the human both performs AND gates
    if node.gate is not None:
        result["gate"] = {
            "type": node.gate.type,
            "required_approvals": node.gate.required_approvals,
            "roles": node.gate.roles,
        }

    return NodeExecutionResult(status=NodeStatus.BLOCKED, result=result)


def _execute_hybrid(
    node: PlaybookNode,
    *,
    vault_context: dict[str, Any] | None = None,
    user_profile: dict[str, Any] | None = None,
) -> NodeExecutionResult:
    """Execute a hybrid node — Otto drafts, then awaits human confirmation.

    The Otto draft is stored in the result. The node stays BLOCKED until
    a human approves via the gate endpoint or completes it manually.
    """
    prompt_context = _build_prompt_context(
        node, vault_context=vault_context, user_profile=user_profile
    )

    result = {
        "type": "hybrid_execution",
        "node_id": node.id,
        "node_name": node.name,
        "archetype": node.otto_archetype or "executor",
        "chamber": node.chamber,
        "prompt_context": prompt_context,
        "draft": f"[Otto/{node.otto_archetype or 'executor'}] Draft: {node.description}",
        "awaiting": "human_confirmation",
        "drafted_at": datetime.now(UTC).isoformat(),
        "stub": True,
    }

    # Hybrid nodes always block for human confirmation
    return NodeExecutionResult(
        status=NodeStatus.BLOCKED,
        result=result,
        gate_pending=node.gate is not None,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_prompt_context(
    node: PlaybookNode,
    *,
    vault_context: dict[str, Any] | None = None,
    user_profile: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build the context dict that would be passed to prompt_composer.

    This validates the composition pipeline without actually calling
    the LLM. In M25, this dict feeds directly into compose_prompt().
    """
    return {
        "archetype": node.otto_archetype or "executor",
        "module": "contracts",  # From template; passed through in real usage
        "chamber": node.chamber,
        "team_type": node.team_type,
        "user_profile": user_profile,
        "vault_context": vault_context,
    }
