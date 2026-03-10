"""Workspace routes — create and retrieve workspaces."""

import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ulid import ULID

from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.schemas.workspace_config import WorkspaceConfigResponse
from src.models.user import User
from src.models.workspace import Workspace
from src.services.workspace_resolver import resolve_domain

router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])


class CreateWorkspaceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str


def _slugify(name: str) -> str:
    """Convert workspace name to URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


@router.get("/resolve", response_model=WorkspaceConfigResponse)
async def resolve_workspace_by_domain(
    domain: str = Query(..., description="Custom domain to resolve"),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> WorkspaceConfigResponse:
    """Resolve a custom domain to its workspace configuration.

    Called by Next.js middleware for multi-domain routing.
    No auth required (called before user is authenticated).
    """
    config = await resolve_domain(domain, db)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Domain not found or not verified",
        )
    return WorkspaceConfigResponse.model_validate(config)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=WorkspaceResponse)
async def create_workspace(
    body: CreateWorkspaceRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> WorkspaceResponse:
    """Create a new workspace and assign the creator as executive."""
    slug = _slugify(body.name)

    # Check slug uniqueness
    existing = (
        db.query(Workspace).filter(Workspace.slug == slug, Workspace.deleted_at.is_(None)).first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Workspace with slug '{slug}' already exists",
        )

    workspace_id = str(ULID())
    workspace = Workspace(id=workspace_id, name=body.name, slug=slug)
    db.add(workspace)

    # Update the creator's workspace_id and promote to executive
    user_id = current_user.get("sub")
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.workspace_id = workspace_id
            user.org_role = "executive"

    db.commit()
    db.refresh(workspace)

    return WorkspaceResponse(id=workspace.id, name=workspace.name, slug=workspace.slug)


@router.get("/me", response_model=WorkspaceResponse)
async def get_my_workspace(
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> WorkspaceResponse:
    """Return the current user's workspace."""
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No workspace associated with this user",
        )

    workspace = (
        db.query(Workspace)
        .filter(Workspace.id == workspace_id, Workspace.deleted_at.is_(None))
        .first()
    )
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )

    return WorkspaceResponse(id=workspace.id, name=workspace.name, slug=workspace.slug)
