"""MAGS Profile Storage routes.

Profile CRUD + workspace membership management:
- POST   /api/v1/profiles              — Create profile from BMY results
- GET    /api/v1/profiles/{user_id}     — Get user's profile
- PUT    /api/v1/profiles/{user_id}/enrich   — Enrich with new signals
- PUT    /api/v1/profiles/{user_id}/override — User selects different profile
- PATCH  /api/v1/profiles/{user_id}/sovereignty — Update privacy controls
- DELETE /api/v1/profiles/{user_id}     — Soft-delete profile
- GET    /api/v1/profiles/{user_id}/changelog — Audit trail

Workspace memberships:
- POST   /api/v1/workspaces/{workspace_id}/memberships
- GET    /api/v1/workspaces/{workspace_id}/memberships
- PUT    /api/v1/workspaces/{workspace_id}/memberships/{user_id}
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.db import get_db
from src.routes.inference import get_engine
from src.schemas.profile import (
    ChangelogEntryResponse,
    ChangelogResponse,
    CreateProfileRequest,
    CreateWorkspaceMembershipRequest,
    EnrichProfileRequest,
    OverrideProfileRequest,
    ProfileResponse,
    UpdateSovereigntyRequest,
    UpdateWorkspaceMembershipRequest,
    WorkspaceMembershipListResponse,
    WorkspaceMembershipResponse,
)
from src.services import profile as profile_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["profiles"])


# =====================================================================
# Profile CRUD
# =====================================================================


@router.post("/profiles", response_model=ProfileResponse, status_code=201)
async def create_profile(
    body: CreateProfileRequest,
    user_id: str,  # Will come from auth in production; query param for dev  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> ProfileResponse:
    """Create a new user profile from BMY inference results."""
    try:
        profile = profile_service.create_profile(db, user_id=user_id, request=body)
        db.commit()
        db.refresh(profile)
        return ProfileResponse.model_validate(profile)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Profile creation failed: user=%s", user_id)
        raise HTTPException(status_code=500, detail="Profile creation failed") from exc


@router.get("/profiles/{user_id}", response_model=ProfileResponse)
async def get_profile(
    user_id: str,
    db: Session = Depends(get_db),  # noqa: B008
) -> ProfileResponse:
    """Get a user's profile."""
    profile = profile_service.get_profile_by_user(db, user_id=user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"No profile found for user {user_id}")
    return ProfileResponse.model_validate(profile)


@router.put("/profiles/{user_id}/enrich", response_model=ProfileResponse)
async def enrich_profile(
    user_id: str,
    body: EnrichProfileRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> ProfileResponse:
    """Enrich an existing profile with additional signal data."""
    try:
        profile = profile_service.enrich_profile(db, user_id=user_id, request=body)
        db.commit()
        db.refresh(profile)
        return ProfileResponse.model_validate(profile)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Profile enrichment failed: user=%s", user_id)
        raise HTTPException(status_code=500, detail="Profile enrichment failed") from exc


@router.put("/profiles/{user_id}/override", response_model=ProfileResponse)
async def override_profile(
    user_id: str,
    body: OverrideProfileRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> ProfileResponse:
    """User manually selects a different profile."""
    try:
        engine = get_engine()
        profile = profile_service.override_profile(db, user_id=user_id, request=body, engine=engine)
        db.commit()
        db.refresh(profile)
        return ProfileResponse.model_validate(profile)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Profile override failed: user=%s", user_id)
        raise HTTPException(status_code=500, detail="Profile override failed") from exc


@router.patch("/profiles/{user_id}/sovereignty", response_model=ProfileResponse)
async def update_sovereignty(
    user_id: str,
    body: UpdateSovereigntyRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> ProfileResponse:
    """Update privacy/sovereignty controls."""
    try:
        profile = profile_service.update_sovereignty(db, user_id=user_id, request=body)
        db.commit()
        db.refresh(profile)
        return ProfileResponse.model_validate(profile)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Sovereignty update failed: user=%s", user_id)
        raise HTTPException(status_code=500, detail="Sovereignty update failed") from exc


@router.delete("/profiles/{user_id}", status_code=204)
async def delete_profile(
    user_id: str,
    db: Session = Depends(get_db),  # noqa: B008
) -> None:
    """Soft-delete a user's profile."""
    try:
        profile_service.soft_delete_profile(db, user_id=user_id)
        db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Profile deletion failed: user=%s", user_id)
        raise HTTPException(status_code=500, detail="Profile deletion failed") from exc


@router.get("/profiles/{user_id}/changelog", response_model=ChangelogResponse)
async def get_changelog(
    user_id: str,
    limit: int = Query(default=50, ge=1, le=200),  # noqa: B008
    offset: int = Query(default=0, ge=0),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> ChangelogResponse:
    """Get audit trail for a user's profile changes."""
    entries, total = profile_service.get_changelog(db, user_id=user_id, limit=limit, offset=offset)
    return ChangelogResponse(
        entries=[ChangelogEntryResponse.model_validate(e) for e in entries],
        total=total,
    )


# =====================================================================
# Workspace Memberships
# =====================================================================


@router.post(
    "/workspaces/{workspace_id}/memberships",
    response_model=WorkspaceMembershipResponse,
    status_code=201,
)
async def create_membership(
    workspace_id: str,
    body: CreateWorkspaceMembershipRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> WorkspaceMembershipResponse:
    """Add a user to a workspace."""
    # Ensure workspace_id in path matches body (immutable copy)
    request = body.model_copy(update={"workspace_id": workspace_id})
    try:
        membership = profile_service.create_workspace_membership(db, request=request)
        db.commit()
        db.refresh(membership)
        return WorkspaceMembershipResponse.model_validate(membership)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Membership creation failed: workspace=%s", workspace_id)
        raise HTTPException(status_code=500, detail="Membership creation failed") from exc


@router.get(
    "/workspaces/{workspace_id}/memberships",
    response_model=WorkspaceMembershipListResponse,
)
async def list_memberships(
    workspace_id: str,
    db: Session = Depends(get_db),  # noqa: B008
) -> WorkspaceMembershipListResponse:
    """List all members of a workspace."""
    memberships = profile_service.list_workspace_memberships(db, workspace_id=workspace_id)
    return WorkspaceMembershipListResponse(
        memberships=[WorkspaceMembershipResponse.model_validate(m) for m in memberships],
        total=len(memberships),
    )


@router.put(
    "/workspaces/{workspace_id}/memberships/{user_id}",
    response_model=WorkspaceMembershipResponse,
)
async def update_membership(
    workspace_id: str,
    user_id: str,
    body: UpdateWorkspaceMembershipRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> WorkspaceMembershipResponse:
    """Update a workspace membership."""
    try:
        membership = profile_service.update_workspace_membership(
            db, workspace_id=workspace_id, user_id=user_id, request=body
        )
        db.commit()
        db.refresh(membership)
        return WorkspaceMembershipResponse.model_validate(membership)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Membership update failed: workspace=%s user=%s", workspace_id, user_id)
        raise HTTPException(status_code=500, detail="Membership update failed") from exc
