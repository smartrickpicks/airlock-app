"""Workspace routes — create and retrieve workspaces."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ulid import ULID

from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.schemas.workspace_config import (
    PublicResolveResponse,
    WorkspaceConfigUpdate,
)
from src.models.user import User
from src.models.workspace import Workspace
from src.models.workspace_config import WorkspaceConfig
from src.services.workspace_resolver import resolve_domain
from src.services.workspace_service import slugify

router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])


class CreateWorkspaceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str


class WorkspaceWithBrandingResponse(BaseModel):
    """Enriched workspace response including branding fields from workspace_config."""

    id: str
    name: str
    slug: str
    industry: str | None = None
    plan: str | None = None
    logo_url: str | None = None
    accent_color: str = "#00d1ff"
    member_count: int = 0


class WorkspaceBrandingUpdate(BaseModel):
    """Subset of WorkspaceConfigUpdate for branding-only PATCH."""

    name: str | None = Field(None, min_length=1, max_length=255)
    industry: str | None = Field(None, max_length=100)
    logo_url: str | None = None
    accent_color: str | None = None


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
    """Create a new workspace and assign the creator as executive.

    Idempotent for a user who already has one: onboarding re-runs return the
    existing workspace instead of 409.
    """
    user_id = current_user.get("sub")

    # Already onboarded? Hand back what they have. Re-running onboarding must
    # not mint a second workspace, and must not fail either.
    if user_id:
        owned = (
            db.query(Workspace)
            .join(User, User.workspace_id == Workspace.id)
            .filter(User.id == user_id, Workspace.deleted_at.is_(None))
            .first()
        )
        if owned:
            return WorkspaceResponse(id=owned.id, name=owned.name, slug=owned.slug)

    # Workspace.slug is globally unique (models/workspace.py: unique=True), and
    # onboarding has no name field — every new user submits the default
    # "My Workspace". Without disambiguation the first signup claims
    # `my-workspace` forever and every later user gets a permanent 409.
    # Suffix until free rather than rejecting.
    base_slug = slugify(body.name)
    slug = base_slug
    for suffix in range(2, 1000):
        taken = (
            db.query(Workspace)
            .filter(Workspace.slug == slug, Workspace.deleted_at.is_(None))
            .first()
        )
        if not taken:
            break
        slug = f"{base_slug}-{suffix}"
    else:
        # 998 collisions on one name — fall back to something guaranteed free
        # rather than handing back a 409 the client cannot act on.
        slug = f"{base_slug}-{str(ULID()).lower()[:8]}"

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


@router.get("/me", response_model=WorkspaceWithBrandingResponse)
async def get_my_workspace(
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> WorkspaceWithBrandingResponse:
    """Return the current user's workspace with branding fields."""
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

    # Fetch branding from workspace_config
    config = (
        db.query(WorkspaceConfig)
        .filter(
            WorkspaceConfig.workspace_id == workspace_id,
            WorkspaceConfig.deleted_at.is_(None),
        )
        .first()
    )

    # Count members
    member_count = (
        db.query(User).filter(User.workspace_id == workspace_id, User.deleted_at.is_(None)).count()
    )

    return WorkspaceWithBrandingResponse(
        id=workspace.id,
        name=workspace.name,
        slug=workspace.slug,
        industry=config.metadata_.get("industry") if config and config.metadata_ else None,
        plan=config.billing_tier if config else None,
        logo_url=config.logo_url if config else None,
        accent_color=config.accent_color if config else "#00d1ff",
        member_count=member_count,
    )


@router.patch("/me/config", response_model=WorkspaceWithBrandingResponse)
async def update_workspace_config(
    body: WorkspaceBrandingUpdate,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> WorkspaceWithBrandingResponse:
    """Update workspace branding config. Only workspace admins (architect/executive)."""
    workspace_id = current_user.get("workspace_id")
    org_role = current_user.get("org_role", "member")

    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No workspace associated with this user",
        )

    # Only admins can update workspace config
    if org_role not in ("architect", "executive"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace admins can update workspace configuration",
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

    config = (
        db.query(WorkspaceConfig)
        .filter(
            WorkspaceConfig.workspace_id == workspace_id,
            WorkspaceConfig.deleted_at.is_(None),
        )
        .first()
    )

    # Create config row if it doesn't exist
    if not config:
        config = WorkspaceConfig(
            id=str(ULID()),
            workspace_id=workspace_id,
        )
        db.add(config)

    # Update workspace name if provided
    if body.name is not None:
        workspace.name = body.name

    # Update branding fields
    if body.logo_url is not None:
        # Validate via the existing schema validator
        validated = WorkspaceConfigUpdate(logo_url=body.logo_url)
        config.logo_url = validated.logo_url

    if body.accent_color is not None:
        validated = WorkspaceConfigUpdate(accent_color=body.accent_color)
        config.accent_color = validated.accent_color

    # Store industry in metadata
    if body.industry is not None:
        current_meta = dict(config.metadata_) if config.metadata_ else {}
        current_meta["industry"] = body.industry
        config.metadata_ = current_meta

    db.commit()
    db.refresh(workspace)
    db.refresh(config)

    member_count = (
        db.query(User).filter(User.workspace_id == workspace_id, User.deleted_at.is_(None)).count()
    )

    return WorkspaceWithBrandingResponse(
        id=workspace.id,
        name=workspace.name,
        slug=workspace.slug,
        industry=config.metadata_.get("industry") if config.metadata_ else None,
        plan=config.billing_tier if config else None,
        logo_url=config.logo_url,
        accent_color=config.accent_color,
        member_count=member_count,
    )
