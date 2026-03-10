"""DAG Execution Engine — orchestrates playbook node execution.

The engine walks the playbook DAG, executing nodes whose dependencies
are satisfied. It pauses at:
- Gate nodes (require human approval)
- Human nodes (require external completion)
- Hybrid nodes (Otto drafts, then waits for human confirmation)

Execution flow:
1. Load instance + template + node states
2. Find runnable nodes (all deps completed, node is pending)
3. Execute each runnable node via NodeExecutor
4. Persist results
5. Repeat until no more runnable nodes (all blocked or completed)
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from src.models.playbook_node_state import PlaybookNodeState
from src.schemas.playbook import (
    InstanceStatus,
    NodeStatus,
    PlaybookTemplate,
    UpdateInstanceRequest,
    UpdateNodeStateRequest,
)
from src.services import playbook as playbook_service
from src.services.dag.executor import execute_node
from src.services.dag.gates import GateAction, process_gate_response
from src.services.playbooks.template_loader import get_template

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Execution result
# ---------------------------------------------------------------------------


class ExecutionSummary:
    """Summary of a DAG execution cycle."""

    __slots__ = ("instance_id", "nodes_executed", "nodes_blocked", "is_complete", "errors")

    def __init__(
        self,
        instance_id: str,
        nodes_executed: list[str] | None = None,
        nodes_blocked: list[str] | None = None,
        *,
        is_complete: bool = False,
        errors: list[str] | None = None,
    ) -> None:
        self.instance_id = instance_id
        self.nodes_executed = nodes_executed or []
        self.nodes_blocked = nodes_blocked or []
        self.is_complete = is_complete
        self.errors = errors or []

    def to_dict(self) -> dict[str, Any]:
        return {
            "instance_id": self.instance_id,
            "nodes_executed": self.nodes_executed,
            "nodes_blocked": self.nodes_blocked,
            "is_complete": self.is_complete,
            "errors": self.errors,
        }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def start_execution(
    db: Session,
    *,
    instance_id: str,
    vault_context: dict[str, Any] | None = None,
    user_profile: dict[str, Any] | None = None,
) -> ExecutionSummary:
    """Start or advance execution of a playbook instance.

    Finds all runnable nodes, executes them, persists state,
    and repeats until no more nodes can run.
    """
    # Load instance
    instance = playbook_service.get_instance(db, instance_id=instance_id)
    if instance is None:
        return ExecutionSummary(instance_id, errors=["Instance not found"])

    # Load template
    template = get_template(instance.template_id)
    if template is None:
        return ExecutionSummary(instance_id, errors=[f"Template not found: {instance.template_id}"])

    # Set instance to running if still draft
    if instance.status == InstanceStatus.DRAFT:
        playbook_service.update_instance(
            db,
            instance_id=instance_id,
            request=UpdateInstanceRequest(status=InstanceStatus.RUNNING),
        )

    # Build template node lookup
    node_map = {n.id: n for n in template.nodes}

    # Execute runnable nodes in a loop until no more can run
    summary = ExecutionSummary(instance_id)
    max_iterations = len(template.nodes) + 1  # Safety bound

    for _ in range(max_iterations):
        # Load current node states
        node_states = playbook_service.get_node_states(db, instance_id=instance_id)
        state_map = {ns.node_id: ns for ns in node_states}

        # Find runnable nodes
        runnable = _get_runnable_nodes(template, state_map)
        if not runnable:
            break

        # Execute each runnable node
        for node_id in runnable:
            node = node_map.get(node_id)
            if node is None:
                summary.errors.append(f"Template node not found: {node_id}")
                continue

            try:
                result = execute_node(
                    node,
                    instance_id=instance_id,
                    vault_context=vault_context,
                    user_profile=user_profile,
                )

                # Persist node state
                update_req = UpdateNodeStateRequest(
                    status=result.status,
                    result=result.result,
                )

                # If the node has a gate and Otto completed, pre-populate gate_response
                if result.gate_pending and node.gate is not None:
                    update_req.gate_response = {
                        "gate_type": node.gate.type,
                        "required_approvals": node.gate.required_approvals,
                        "roles": node.gate.roles,
                        "approved": False,
                        "responses": [],
                    }

                playbook_service.update_node_state(
                    db,
                    instance_id=instance_id,
                    node_id=node_id,
                    request=update_req,
                )

                if result.status == NodeStatus.COMPLETED:
                    summary.nodes_executed.append(node_id)
                else:
                    summary.nodes_blocked.append(node_id)
            except Exception as exc:
                logger.exception("Node execution failed: %s", node_id)
                summary.errors.append(f"Node '{node_id}' failed: {exc}")
                break

    # Check if playbook is complete (all nodes completed or skipped)
    final_states = playbook_service.get_node_states(db, instance_id=instance_id)
    terminal = {NodeStatus.COMPLETED, NodeStatus.SKIPPED}
    summary.is_complete = all(ns.status in terminal for ns in final_states)

    if summary.is_complete:
        playbook_service.update_instance(
            db,
            instance_id=instance_id,
            request=UpdateInstanceRequest(status=InstanceStatus.COMPLETED),
        )

    return summary


def complete_node(
    db: Session,
    *,
    instance_id: str,
    node_id: str,
    result: dict[str, Any] | None = None,
) -> ExecutionSummary:
    """Externally complete a blocked node (human/hybrid completion).

    After completing the node, advances the DAG to execute any
    newly unblocked nodes.
    """
    node_state = playbook_service.get_node_state(db, instance_id=instance_id, node_id=node_id)
    if node_state is None:
        return ExecutionSummary(instance_id, errors=[f"Node not found: {node_id}"])

    if node_state.status != NodeStatus.BLOCKED:
        return ExecutionSummary(
            instance_id,
            errors=[f"Node '{node_id}' is not blocked (status: {node_state.status})"],
        )

    # Reject completion if node has an unapproved gate — use /gate endpoint instead
    if node_state.gate_response and not node_state.gate_response.get("approved", False):
        return ExecutionSummary(
            instance_id,
            errors=[f"Node '{node_id}' has an unapproved gate — use the /gate endpoint"],
        )

    # Mark as completed
    update_data: dict[str, Any] = {"status": NodeStatus.COMPLETED}
    if result is not None:
        # Merge with existing result (Otto draft + human completion)
        existing = dict(node_state.result) if node_state.result else {}
        existing.update(result)
        existing["completed_by"] = "human"
        existing["completed_at"] = datetime.now(UTC).isoformat()
        update_data["result"] = existing

    playbook_service.update_node_state(
        db,
        instance_id=instance_id,
        node_id=node_id,
        request=UpdateNodeStateRequest(**update_data),
    )

    # Advance the DAG
    return start_execution(db, instance_id=instance_id)


def respond_to_gate(
    db: Session,
    *,
    instance_id: str,
    node_id: str,
    action: str,
    responder_id: str,
    comment: str | None = None,
) -> ExecutionSummary:
    """Process a gate response and advance the DAG if approved.

    Args:
        instance_id: The playbook instance
        node_id: The node with the gate
        action: approve, reject, or request_changes
        responder_id: Who is responding
        comment: Optional comment
    """
    # Load instance and template
    instance = playbook_service.get_instance(db, instance_id=instance_id)
    if instance is None:
        return ExecutionSummary(instance_id, errors=["Instance not found"])

    template = get_template(instance.template_id)
    if template is None:
        return ExecutionSummary(instance_id, errors=[f"Template not found: {instance.template_id}"])

    # Find the template node to get gate config
    node_map = {n.id: n for n in template.nodes}
    template_node = node_map.get(node_id)
    if template_node is None or template_node.gate is None:
        return ExecutionSummary(instance_id, errors=[f"No gate found on node: {node_id}"])

    # Load current node state
    node_state = playbook_service.get_node_state(db, instance_id=instance_id, node_id=node_id)
    if node_state is None:
        return ExecutionSummary(instance_id, errors=[f"Node state not found: {node_id}"])

    # Process the gate response
    try:
        gate_result = process_gate_response(
            template_node.gate,
            action=action,
            responder_id=responder_id,
            comment=comment,
            existing_response=node_state.gate_response,
        )
    except ValueError as exc:
        return ExecutionSummary(instance_id, errors=[str(exc)])

    # Update gate response data — status tracks execution, gate_response tracks approval
    update_data: dict[str, Any] = {"gate_response": gate_result.response_data}

    # If approved and node was blocked (hybrid/human with gate), mark completed
    if gate_result.approved and node_state.status in {NodeStatus.BLOCKED, NodeStatus.COMPLETED}:
        update_data["status"] = NodeStatus.COMPLETED

    # If rejected, only set BLOCKED for hybrid/human nodes that were already blocked.
    # Do NOT regress a COMPLETED Otto node to BLOCKED — that creates a deadlock
    # (node can't re-run from BLOCKED, and downstream nodes see approved=False).
    # Gate rejection state is tracked in gate_response, not node execution status.
    if (
        gate_result.action in {GateAction.REJECT, GateAction.REQUEST_CHANGES}
        and node_state.status == NodeStatus.BLOCKED
    ):
        update_data["status"] = NodeStatus.BLOCKED  # Keep blocked (no-op but explicit)

    playbook_service.update_node_state(
        db,
        instance_id=instance_id,
        node_id=node_id,
        request=UpdateNodeStateRequest(**update_data),
    )

    # If gate was approved, advance the DAG
    if gate_result.approved:
        return start_execution(db, instance_id=instance_id)

    return ExecutionSummary(instance_id, nodes_blocked=[node_id])


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _get_runnable_nodes(
    template: PlaybookTemplate,
    state_map: dict[str, PlaybookNodeState],
) -> list[str]:
    """Find nodes whose dependencies are all satisfied.

    A node is runnable if:
    1. Its status is PENDING (not yet started)
    2. All nodes in its depends_on list have status COMPLETED or SKIPPED
    3. If any dependency has a gate, that gate must be approved
    """
    completed_statuses = {NodeStatus.COMPLETED, NodeStatus.SKIPPED}
    runnable: list[str] = []

    for node in template.nodes:
        state = state_map.get(node.id)
        if state is None or state.status != NodeStatus.PENDING:
            continue

        # Check all dependencies
        deps_met = True
        for dep_id in node.depends_on:
            dep_state = state_map.get(dep_id)
            if dep_state is None or dep_state.status not in completed_statuses:
                deps_met = False
                break

            # Check if dependency has an unresolved gate
            if dep_state.gate_response and not dep_state.gate_response.get("approved", False):
                deps_met = False
                break

        if deps_met:
            runnable.append(node.id)

    return runnable
