"""Workflow routes — CRUD + execution."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.workflows.schemas import (
    CreateWorkflowRequest,
    ExecuteWorkflowRequest,
    UpdateWorkflowRequest,
)
from src.workflows.service import (
    create_workflow,
    execute_workflow,
    get_workflow,
    list_runs,
    list_workflows,
    update_workflow,
)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.get("")
def get_workflows(
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """List all workflows."""
    workflows = list_workflows(db, user.get("workspace_id", "ws_dev"))
    return {"workflows": workflows}


@router.post("")
def create_new_workflow(
    request: CreateWorkflowRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Create a new workflow."""
    return create_workflow(
        db,
        workspace_id=user.get("workspace_id", "ws_dev"),
        user_id=user["sub"],
        name=request.name,
        description=request.description,
        category=request.category,
        definition=request.definition,
        trigger_type=request.trigger_type,
        trigger_config=request.trigger_config,
    )


@router.get("/{workflow_id}")
def get_single_workflow(
    workflow_id: str,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Get a workflow by ID."""
    result = get_workflow(db, workflow_id)
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return result


@router.put("/{workflow_id}")
def update_existing_workflow(
    workflow_id: str,
    request: UpdateWorkflowRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Update a workflow definition."""
    result = update_workflow(db, workflow_id, request.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return result


@router.post("/{workflow_id}/execute")
def trigger_workflow(
    workflow_id: str,
    request: ExecuteWorkflowRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Execute a workflow manually."""
    return execute_workflow(
        db,
        workflow_id=workflow_id,
        workspace_id=user.get("workspace_id", "ws_dev"),
        trigger_data=request.trigger_data,
    )


@router.get("/{workflow_id}/runs")
def get_workflow_runs(
    workflow_id: str,
    limit: int = Query(default=20, le=100),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Get execution history for a workflow."""
    runs = list_runs(db, workflow_id, limit=limit)
    return {"runs": runs}
