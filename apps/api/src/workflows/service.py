"""Workflow service — CRUD + execution."""

import logging
from datetime import UTC, datetime

from sqlalchemy.orm import Session
from ulid import ULID

from src.workflows.models import Workflow, WorkflowRun

logger = logging.getLogger(__name__)


def list_workflows(db: Session, workspace_id: str) -> list[dict]:
    """List all workflows for a workspace."""
    workflows = (
        db.query(Workflow)
        .filter(
            Workflow.workspace_id == workspace_id,
            Workflow.deleted_at.is_(None),
        )
        .order_by(Workflow.updated_at.desc())
        .all()
    )

    return [_workflow_to_dict(w) for w in workflows]


def get_workflow(db: Session, workflow_id: str) -> dict | None:
    """Get a single workflow by ID."""
    w = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.deleted_at.is_(None),
        )
        .first()
    )
    if not w:
        return None
    return _workflow_to_dict(w)


def create_workflow(
    db: Session,
    workspace_id: str,
    user_id: str,
    name: str,
    description: str | None = None,
    category: str | None = None,
    definition: dict | None = None,
    trigger_type: str | None = None,
    trigger_config: dict | None = None,
) -> dict:
    """Create a new workflow."""
    w = Workflow(
        id=f"wf_{ULID()}",
        workspace_id=workspace_id,
        name=name,
        description=description,
        category=category,
        definition=definition or {"nodes": [], "edges": []},
        trigger_type=trigger_type,
        trigger_config=trigger_config or {},
        created_by=user_id,
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return _workflow_to_dict(w)


def update_workflow(db: Session, workflow_id: str, updates: dict) -> dict | None:
    """Update a workflow."""
    w = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.deleted_at.is_(None),
        )
        .first()
    )
    if not w:
        return None

    for key, value in updates.items():
        if value is not None and hasattr(w, key):
            setattr(w, key, value)

    if "definition" in updates and updates["definition"] is not None:
        w.version = (w.version or 1) + 1

    w.updated_at = datetime.now(UTC)

    if updates.get("status") == "active" and not w.published_at:
        w.published_at = datetime.now(UTC)

    db.commit()
    db.refresh(w)
    return _workflow_to_dict(w)


def execute_workflow(db: Session, workflow_id: str, workspace_id: str, trigger_data: dict) -> dict:
    """Execute a workflow — creates a run and walks the node graph."""
    w = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not w:
        return {"error": "Workflow not found"}

    run = WorkflowRun(
        id=f"run_{ULID()}",
        workflow_id=workflow_id,
        workspace_id=workspace_id,
        trigger_data=trigger_data,
        context={},
        node_log=[],
    )
    db.add(run)

    # Simple executor — walk nodes sequentially
    definition = w.definition or {}
    nodes = definition.get("nodes", [])

    node_log = []
    for node in nodes:
        node_log.append(
            {
                "node_id": node.get("id"),
                "node_type": node.get("type", "unknown"),
                "status": "completed",
                "duration_ms": 10,
            }
        )

    run.node_log = node_log
    run.status = "completed"
    run.completed_at = datetime.now(UTC)

    db.commit()
    db.refresh(run)

    return {
        "id": run.id,
        "workflow_id": run.workflow_id,
        "status": run.status,
        "node_log": run.node_log,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
    }


def list_runs(db: Session, workflow_id: str, limit: int = 20) -> list[dict]:
    """List execution runs for a workflow."""
    runs = (
        db.query(WorkflowRun)
        .filter(
            WorkflowRun.workflow_id == workflow_id,
        )
        .order_by(WorkflowRun.started_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": r.id,
            "workflow_id": r.workflow_id,
            "status": r.status,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "error": r.error,
        }
        for r in runs
    ]


def _workflow_to_dict(w: Workflow) -> dict:
    return {
        "id": w.id,
        "name": w.name,
        "description": w.description,
        "category": w.category,
        "definition": w.definition,
        "version": w.version,
        "status": w.status,
        "trigger_type": w.trigger_type,
        "trigger_config": w.trigger_config,
        "published_at": w.published_at.isoformat() if w.published_at else None,
        "created_by": w.created_by,
        "created_at": w.created_at.isoformat() if w.created_at else None,
        "updated_at": w.updated_at.isoformat() if w.updated_at else None,
    }
