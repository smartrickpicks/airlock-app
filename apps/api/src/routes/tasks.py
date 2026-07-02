"""Tasks module routes — queries task-type vaults across all modules."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.vault import Vault

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


def _priority_to_severity(priority: str) -> str:
    """Map seed priority to frontend severity."""
    mapping = {
        "high": "urgent",
        "medium": "warning",
        "low": "info",
    }
    return mapping.get(priority, "info")


def _map_status(status: str) -> str:
    """Map seed status to frontend task status."""
    mapping = {
        "todo": "open",
        "in_progress": "in_progress",
        "done": "resolved",
        "dismissed": "dismissed",
    }
    return mapping.get(status, "open")


@router.get("")
async def list_tasks(
    module_type: str | None = Query(default=None, description="Filter by module"),  # noqa: B008
    status: str | None = Query(default=None, description="Filter by status metadata"),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Return tasks shaped for the frontend store.

    Queries vaults with vault_type='task' (or module_type='triage')
    and reshapes into the Task[] format the frontend expects.
    """
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=403, detail="No workspace associated")

    stmt = (
        select(Vault).where(Vault.workspace_id == workspace_id).where(Vault.archived_at.is_(None))
    )

    if module_type:
        stmt = stmt.where(Vault.module_type == module_type)
    else:
        stmt = stmt.where(
            or_(
                Vault.vault_type == "task",
                Vault.module_type == "triage",
            )
        )

    if status:
        stmt = stmt.where(Vault.metadata_.isnot(None))
        stmt = stmt.where(Vault.metadata_["status"].astext == status)

    vaults = db.execute(stmt).scalars().all()

    tasks = []
    for v in vaults:
        meta = v.metadata_ or {}
        tasks.append(
            {
                "id": v.id,
                "title": v.name,
                "description": meta.get("description", ""),
                "taskType": meta.get("task_type", "manual"),
                "moduleType": v.module_type or "tasks",
                "vaultSlug": v.slug,
                "vaultName": v.name,
                "fieldCode": None,
                "severity": _priority_to_severity(meta.get("priority", "medium")),
                "status": _map_status(meta.get("status", "todo")),
                "assignedTo": meta.get("assignee"),
                "assignedToName": None,
                "createdBy": "system",
                "createdByName": "System",
                "source": "seed",
                "dueAt": meta.get("due_at"),
                "createdAt": v.created_at.isoformat() if v.created_at else "",
                "updatedAt": v.updated_at.isoformat() if v.updated_at else "",
            }
        )

    return {"tasks": tasks}


# -- Status map: frontend → DB seed convention --------------------------------

_REVERSE_STATUS = {
    "open": "todo",
    "in_progress": "in_progress",
    "resolved": "done",
    "dismissed": "dismissed",
}


class UpdateTaskStatusRequest(BaseModel):
    status: str


@router.patch("/{task_id}/status")
async def update_task_status(
    task_id: str,
    body: UpdateTaskStatusRequest,
    db: Session = Depends(get_db),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Move a task to a new status (Kanban drag-and-drop)."""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=403, detail="No workspace associated")

    vault = db.execute(
        select(Vault).where(Vault.id == task_id, Vault.workspace_id == workspace_id)
    ).scalar_one_or_none()

    if vault is None:
        raise HTTPException(status_code=404, detail="Task not found")

    db_status = _REVERSE_STATUS.get(body.status, body.status)
    meta = dict(vault.metadata_ or {})
    meta["status"] = db_status
    vault.metadata_ = meta
    vault.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(vault)

    return {"id": vault.id, "status": body.status, "updatedAt": vault.updated_at.isoformat()}
