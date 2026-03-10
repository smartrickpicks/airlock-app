"""Workspace routes — create and retrieve workspaces."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ulid import ULID

from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.schemas.workspace_config import PublicResolveResponse
from src.models.user import User
from src.models.workspace import Workspace
from src.services.workspace_resolver import resolve_domain
from src.services.workspace_service import slugify

router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])


class CreateWorkspaceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str


@router.get("/resolve", response_model=PublicResolveResponse)
async def resolve_workspace_by_domain(
    domain: str = Query(  # noqa: B008
        ...,
        description="Custom domain to resolve",
        max_length=253,
        pattern=r"^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$",
    ),
    db: Session = Depends(get_db),  # noqa: B008
) -> PublicResolveResponse:
    """Resolve a custom domain to its workspace configuration.

    Called by Next.js middleware for multi-domain routing.
    No auth required (called before user is authenticated).
    Returns a minimal response — no billing, Stripe, or limit data.
    """
    config = await resolve_domain(domain, db)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Domain not found or not verified",
        )
    return PublicResolveResponse.model_validate(config)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=WorkspaceResponse)
async def create_workspace(
    body: CreateWorkspaceRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> WorkspaceResponse:
    """Create a new workspace and assign the creator as executive."""
    slug = slugify(body.name)

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
