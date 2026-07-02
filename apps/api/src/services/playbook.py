"""Playbook service — CRUD operations for playbook instances and node states.

Business logic for:
- Creating playbook instances from templates
- Initializing node states from template nodes
- Updating instance and node status
- Querying instances by workspace/vault
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.playbook_instance import PlaybookInstance
from src.models.playbook_node_state import PlaybookNodeState
from src.schemas.playbook import (
    CreateInstanceRequest,
    InstanceStatus,
    NodeStatus,
    PlaybookTemplate,
    UpdateInstanceRequest,
    UpdateNodeStateRequest,
)
from src.services.playbooks.template_loader import get_template

logger = logging.getLogger(__name__)


# =====================================================================
# Instance CRUD
# =====================================================================


def create_instance(
    db: Session,
    *,
    request: CreateInstanceRequest,
) -> PlaybookInstance:
    """Create a playbook instance from a template.

    Also initializes all node states from the template nodes.
    """
    # Validate template exists
    template = get_template(request.template_id)
    if template is None:
        msg = f"Unknown template: {request.template_id}"
        raise ValueError(msg)

    # Create instance
    instance_id = str(ULID())
    instance = PlaybookInstance(
        id=instance_id,
        workspace_id=request.workspace_id,
        template_id=request.template_id,
        vault_id=request.vault_id,
        status=InstanceStatus.DRAFT,
    )
    db.add(instance)

    # Initialize node states from template
    _initialize_node_states(
        db, instance_id=instance_id, workspace_id=request.workspace_id, template=template
    )

    return instance


def get_instance(db: Session, *, instance_id: str) -> PlaybookInstance | None:
    """Get a playbook instance by ID."""
    stmt = select(PlaybookInstance).where(
        PlaybookInstance.id == instance_id,
        PlaybookInstance.deleted_at.is_(None),
    )
    return db.execute(stmt).scalar_one_or_none()


def list_instances(
    db: Session,
    *,
    workspace_id: str,
    vault_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[PlaybookInstance], int]:
    """List playbook instances for a workspace, optionally filtered by vault."""
    base = select(PlaybookInstance).where(
        PlaybookInstance.workspace_id == workspace_id,
        PlaybookInstance.deleted_at.is_(None),
    )

    if vault_id is not None:
        base = base.where(PlaybookInstance.vault_id == vault_id)

    # Count — use SQL COUNT(*) instead of fetching all rows
    count_base = select(PlaybookInstance.id).where(
        PlaybookInstance.workspace_id == workspace_id,
        PlaybookInstance.deleted_at.is_(None),
    )
    if vault_id is not None:
        count_base = count_base.where(PlaybookInstance.vault_id == vault_id)
    count_stmt = select(func.count()).select_from(count_base.subquery())
    total = db.execute(count_stmt).scalar_one()

    # Paginate
    stmt = base.order_by(PlaybookInstance.created_at.desc()).offset(offset).limit(limit)
    instances = list(db.execute(stmt).scalars().all())

    return instances, total


def update_instance(
    db: Session,
    *,
    instance_id: str,
    request: UpdateInstanceRequest,
) -> PlaybookInstance:
    """Update a playbook instance status."""
    instance = get_instance(db, instance_id=instance_id)
    if instance is None:
        msg = f"Instance not found: {instance_id}"
        raise ValueError(msg)

    if request.status is not None:
        instance.status = request.status

        # Set timestamps based on status transitions
        now = datetime.now(UTC)
        if request.status == InstanceStatus.RUNNING and instance.started_at is None:
            instance.started_at = now
        elif request.status in {InstanceStatus.COMPLETED, InstanceStatus.CANCELLED}:
            instance.completed_at = now

    return instance


# =====================================================================
# Node State CRUD
# =====================================================================


def get_node_states(db: Session, *, instance_id: str) -> list[PlaybookNodeState]:
    """Get all node states for a playbook instance."""
    stmt = (
        select(PlaybookNodeState)
        .where(PlaybookNodeState.instance_id == instance_id)
        .order_by(PlaybookNodeState.created_at)
    )
    return list(db.execute(stmt).scalars().all())


def get_node_state(
    db: Session,
    *,
    instance_id: str,
    node_id: str,
) -> PlaybookNodeState | None:
    """Get a specific node state by instance and node ID."""
    stmt = select(PlaybookNodeState).where(
        PlaybookNodeState.instance_id == instance_id,
        PlaybookNodeState.node_id == node_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def update_node_state(
    db: Session,
    *,
    instance_id: str,
    node_id: str,
    request: UpdateNodeStateRequest,
) -> PlaybookNodeState:
    """Update a node's state within a playbook instance."""
    node_state = get_node_state(db, instance_id=instance_id, node_id=node_id)
    if node_state is None:
        msg = f"Node state not found: instance={instance_id}, node={node_id}"
        raise ValueError(msg)

    now = datetime.now(UTC)

    if request.status is not None:
        node_state.status = request.status

        # Set timestamps based on status transitions
        if request.status == NodeStatus.IN_PROGRESS and node_state.started_at is None:
            node_state.started_at = now
        elif request.status in {NodeStatus.COMPLETED, NodeStatus.SKIPPED}:
            node_state.completed_at = now

    if request.result is not None:
        node_state.result = request.result

    if request.gate_response is not None:
        node_state.gate_response = request.gate_response

    return node_state


# =====================================================================
# Internal helpers
# =====================================================================


def _initialize_node_states(
    db: Session,
    *,
    instance_id: str,
    workspace_id: str,
    template: PlaybookTemplate,
) -> list[PlaybookNodeState]:
    """Create initial node states for all nodes in a template."""
    node_states: list[PlaybookNodeState] = []

    for node in template.nodes:
        node_state = PlaybookNodeState(
            id=str(ULID()),
            instance_id=instance_id,
            workspace_id=workspace_id,
            node_id=node.id,
            status=NodeStatus.PENDING,
            actor=node.actor,
            archetype=node.otto_archetype,
        )
        db.add(node_state)
        node_states.append(node_state)

    return node_states
