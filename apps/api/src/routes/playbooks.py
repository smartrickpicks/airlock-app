"""Playbook routes — CRUD for templates, instances, and node states.

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
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.db import get_db
from src.schemas.playbook import (
    CreateInstanceRequest,
    InstanceListResponse,
    InstanceResponse,
    NodeStateResponse,
    PlaybookTemplate,
    TemplateListResponse,
    UpdateInstanceRequest,
    UpdateNodeStateRequest,
)
from src.services import playbook as playbook_service
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
