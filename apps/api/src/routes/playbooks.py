"""Playbook routes — CRUD for templates, instances, node states, and DAG execution.

Template endpoints (read-only from YAML):
- GET    /api/v1/playbooks/templates                    — List available templates
- GET    /api/v1/playbooks/templates/{template_id}      — Get template details

Instance endpoints (database state):
- POST   /api/v1/playbooks/instances                    — Create instance from template
- GET    /api/v1/playbooks/instances                    — List instances (by workspace/vault)
- GET    /api/v1/playbooks/instances/{instance_id}      — Get instance with node states
- PATCH  /api/v1/playbooks/instances/{instance_id}      — Update instance status

Node state endpoints:
- GET    /api/v1/playbooks/instances/{instance_id}/nodes              — Get node states
- PATCH  /api/v1/playbooks/instances/{instance_id}/nodes/{node_id}   — Update node state

DAG Execution endpoints (M7):
- POST   /api/v1/playbooks/instances/{instance_id}/execute                    — Start/advance execution
- POST   /api/v1/playbooks/instances/{instance_id}/nodes/{node_id}/complete   — Complete a blocked node
- POST   /api/v1/playbooks/instances/{instance_id}/nodes/{node_id}/gate       — Respond to a gate
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.db import get_db
from src.schemas.playbook import (
    CompleteNodeRequest,
    CreateInstanceRequest,
    ExecuteRequest,
    ExecutionResponse,
    GateResponseRequest,
    InstanceListResponse,
    InstanceResponse,
    NodeStateResponse,
    PlaybookTemplate,
    TemplateListResponse,
    UpdateInstanceRequest,
    UpdateNodeStateRequest,
)
from src.services import playbook as playbook_service
from src.services.dag.engine import complete_node, respond_to_gate, start_execution
from src.services.playbooks.template_loader import get_template, list_templates

logger = logging.getLogger(__name__)

# TODO(M25): Add auth dependency — derive workspace_id from JWT instead of
# accepting it as a query param / request body field.  All instance-write
# routes should use Depends(get_current_user) once the auth layer is wired.
router = APIRouter(prefix="/api/v1/playbooks", tags=["playbooks"])


# =====================================================================
# Template Endpoints (read-only from YAML)
# =====================================================================


@router.get("/templates", response_model=TemplateListResponse)
async def list_playbook_templates() -> TemplateListResponse:
    """List all available playbook templates."""
    templates = list_templates()
    return TemplateListResponse(templates=templates, total=len(templates))


@router.get("/templates/{template_id}", response_model=PlaybookTemplate)
async def get_playbook_template(template_id: str) -> PlaybookTemplate:
    """Get a specific playbook template by ID."""
    template = get_template(template_id)
    if template is None:
        raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")
    return template


# =====================================================================
# Instance Endpoints (database state)
# =====================================================================


@router.post("/instances", response_model=InstanceResponse, status_code=201)
async def create_instance(
    body: CreateInstanceRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> InstanceResponse:
    """Create a playbook instance from a template."""
    try:
        instance = playbook_service.create_instance(db, request=body)
        db.commit()
        db.refresh(instance)
        # Load node states for the response
        node_states = playbook_service.get_node_states(db, instance_id=instance.id)
        return InstanceResponse(
            id=instance.id,
            workspace_id=instance.workspace_id,
            template_id=instance.template_id,
            vault_id=instance.vault_id,
            status=instance.status,
            started_at=instance.started_at,
            completed_at=instance.completed_at,
            created_at=instance.created_at,
            updated_at=instance.updated_at,
            node_states=[NodeStateResponse.model_validate(ns) for ns in node_states],
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Instance creation failed")
        raise HTTPException(status_code=500, detail="Instance creation failed") from exc


@router.get("/instances", response_model=InstanceListResponse)
async def list_instances(
    workspace_id: str = Query(...),  # noqa: B008
    vault_id: str | None = Query(default=None),  # noqa: B008
    limit: int = Query(default=50, ge=1, le=200),  # noqa: B008
    offset: int = Query(default=0, ge=0),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> InstanceListResponse:
    """List playbook instances for a workspace, optionally filtered by vault."""
    instances, total = playbook_service.list_instances(
        db,
        workspace_id=workspace_id,
        vault_id=vault_id,
        limit=limit,
        offset=offset,
    )
    return InstanceListResponse(
        instances=[InstanceResponse.model_validate(i) for i in instances],
        total=total,
    )


@router.get("/instances/{instance_id}", response_model=InstanceResponse)
async def get_instance(
    instance_id: str,
    db: Session = Depends(get_db),  # noqa: B008
) -> InstanceResponse:
    """Get a playbook instance with its node states."""
    instance = playbook_service.get_instance(db, instance_id=instance_id)
    if instance is None:
        raise HTTPException(status_code=404, detail=f"Instance not found: {instance_id}")

    node_states = playbook_service.get_node_states(db, instance_id=instance_id)
    return InstanceResponse(
        id=instance.id,
        workspace_id=instance.workspace_id,
        template_id=instance.template_id,
        vault_id=instance.vault_id,
        status=instance.status,
        started_at=instance.started_at,
        completed_at=instance.completed_at,
        created_at=instance.created_at,
        updated_at=instance.updated_at,
        node_states=[NodeStateResponse.model_validate(ns) for ns in node_states],
    )


@router.patch("/instances/{instance_id}", response_model=InstanceResponse)
async def update_instance(
    instance_id: str,
    body: UpdateInstanceRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> InstanceResponse:
    """Update a playbook instance status."""
    # Check existence first — separate 404 from business-logic ValueError (400)
    existing = playbook_service.get_instance(db, instance_id=instance_id)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Instance not found: {instance_id}")

    try:
        instance = playbook_service.update_instance(db, instance_id=instance_id, request=body)
        db.commit()
        db.refresh(instance)
        node_states = playbook_service.get_node_states(db, instance_id=instance_id)
        return InstanceResponse(
            id=instance.id,
            workspace_id=instance.workspace_id,
            template_id=instance.template_id,
            vault_id=instance.vault_id,
            status=instance.status,
            started_at=instance.started_at,
            completed_at=instance.completed_at,
            created_at=instance.created_at,
            updated_at=instance.updated_at,
            node_states=[NodeStateResponse.model_validate(ns) for ns in node_states],
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Instance update failed: %s", instance_id)
        raise HTTPException(status_code=500, detail="Instance update failed") from exc


# =====================================================================
# Node State Endpoints
# =====================================================================


@router.get(
    "/instances/{instance_id}/nodes",
    response_model=list[NodeStateResponse],
)
async def list_node_states(
    instance_id: str,
    db: Session = Depends(get_db),  # noqa: B008
) -> list[NodeStateResponse]:
    """Get all node states for a playbook instance."""
    # Verify instance exists
    instance = playbook_service.get_instance(db, instance_id=instance_id)
    if instance is None:
        raise HTTPException(status_code=404, detail=f"Instance not found: {instance_id}")

    node_states = playbook_service.get_node_states(db, instance_id=instance_id)
    return [NodeStateResponse.model_validate(ns) for ns in node_states]


@router.patch(
    "/instances/{instance_id}/nodes/{node_id}",
    response_model=NodeStateResponse,
)
async def update_node_state(
    instance_id: str,
    node_id: str,
    body: UpdateNodeStateRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> NodeStateResponse:
    """Update a node's state within a playbook instance."""
    # Verify instance exists
    existing = playbook_service.get_instance(db, instance_id=instance_id)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Instance not found: {instance_id}")

    try:
        node_state = playbook_service.update_node_state(
            db,
            instance_id=instance_id,
            node_id=node_id,
            request=body,
        )
        db.commit()
        db.refresh(node_state)
        return NodeStateResponse.model_validate(node_state)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Node state update failed: instance=%s node=%s", instance_id, node_id)
        raise HTTPException(status_code=500, detail="Node state update failed") from exc


# =====================================================================
# DAG Execution Endpoints (M7)
# =====================================================================


@router.post(
    "/instances/{instance_id}/execute",
    response_model=ExecutionResponse,
)
async def execute_instance(
    instance_id: str,
    body: ExecuteRequest | None = None,
    db: Session = Depends(get_db),  # noqa: B008
) -> ExecutionResponse:
    """Start or advance DAG execution on a playbook instance.

    Walks the DAG, executing all runnable nodes (those whose dependencies
    are satisfied). Returns a summary of what was executed and what's blocked.
    """
    existing = playbook_service.get_instance(db, instance_id=instance_id)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Instance not found: {instance_id}")

    try:
        summary = start_execution(
            db,
            instance_id=instance_id,
            vault_context=body.vault_context if body else None,
            user_profile=body.user_profile if body else None,
        )
        db.commit()

        if summary.errors:
            raise HTTPException(status_code=400, detail="; ".join(summary.errors))

        return ExecutionResponse(**summary.to_dict())
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("DAG execution failed: %s", instance_id)
        raise HTTPException(status_code=500, detail="DAG execution failed") from exc


@router.post(
    "/instances/{instance_id}/nodes/{node_id}/complete",
    response_model=ExecutionResponse,
)
async def complete_blocked_node(
    instance_id: str,
    node_id: str,
    body: CompleteNodeRequest | None = None,
    db: Session = Depends(get_db),  # noqa: B008
) -> ExecutionResponse:
    """Complete a blocked node (human or hybrid) and advance the DAG.

    After completing the node, the engine walks forward to execute
    any nodes that are now unblocked.
    """
    existing = playbook_service.get_instance(db, instance_id=instance_id)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Instance not found: {instance_id}")

    try:
        summary = complete_node(
            db,
            instance_id=instance_id,
            node_id=node_id,
            result=body.result if body else None,
        )
        db.commit()

        if summary.errors:
            raise HTTPException(status_code=400, detail="; ".join(summary.errors))

        return ExecutionResponse(**summary.to_dict())
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Node completion failed: instance=%s node=%s", instance_id, node_id)
        raise HTTPException(status_code=500, detail="Node completion failed") from exc


@router.post(
    "/instances/{instance_id}/nodes/{node_id}/gate",
    response_model=ExecutionResponse,
)
async def respond_to_node_gate(
    instance_id: str,
    node_id: str,
    body: GateResponseRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> ExecutionResponse:
    """Respond to a gate checkpoint on a node (approve/reject/request_changes).

    If approved and the approval threshold is met, advances the DAG.
    If rejected, the node stays blocked for rework.
    """
    existing = playbook_service.get_instance(db, instance_id=instance_id)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Instance not found: {instance_id}")

    try:
        summary = respond_to_gate(
            db,
            instance_id=instance_id,
            node_id=node_id,
            action=body.action,
            responder_id=body.responder_id,
            comment=body.comment,
        )
        db.commit()

        if summary.errors:
            raise HTTPException(status_code=400, detail="; ".join(summary.errors))

        return ExecutionResponse(**summary.to_dict())
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Gate response failed: instance=%s node=%s", instance_id, node_id)
        raise HTTPException(status_code=500, detail="Gate response failed") from exc
