"""Member onboarding routes — lightweight PI inference + auto-sync for invited members.

Workspace owners go through the full Forge. Invited members get a shorter flow:
1. Answer 2-3 quick questions (goal + autonomy preference)
2. Otto infers their PI profile and assigns a persona badge
3. Auto-triggers Google sync if they have a Google connection
4. Returns badge data + profile for the frontend to display
"""

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.config import settings
from src.db import get_db
from src.middleware.auth import get_current_user
from src.routes.inference import get_service
from src.schemas.inference import BMYRequest, DriveSignals
from src.schemas.profile import CreateProfileRequest
from src.services import profile as profile_service
from src.services.action_resolver import ActionResolver
from src.services.badge import get_badge_data
from src.services.google_oauth import get_google_connection
from src.services.sync_orchestrator import run_full_sync

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class MemberInferRequest(BaseModel):
    """Quick inference request for invited members."""

    goal_statement: str | None = Field(
        default=None,
        description="What are you here to accomplish?",
    )
    autonomy_preference: str | None = Field(
        default=None,
        description="How much should Otto handle?",
    )
    job_title: str | None = Field(
        default=None,
        description="Job title (from invite or manual entry)",
    )
    industry: str | None = Field(
        default=None,
        description="Industry context",
    )


class MemberInferResponse(BaseModel):
    """Inference result with badge data for the frontend."""

    profile_id: str
    profile_name: str
    meta_archetype: str
    confidence: float
    drives: dict
    badge: dict
    workspace_config: dict
    otto_config: dict
    sync_triggered: bool = False
    sync_result: dict | None = None


# ---------------------------------------------------------------------------
# POST /onboarding/member/infer — quick PI inference for invited members
# ---------------------------------------------------------------------------


@router.post("/member/infer")
async def member_infer(
    body: MemberInferRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> MemberInferResponse:
    """Run lightweight PI inference for an invited team member.

    Steps:
    1. Run BMY inference with provided signals
    2. Create/update user profile with results
    3. Trigger Google sync if connection exists
    4. Return badge data for the frontend
    """
    user_id = current_user.get("sub", "")
    workspace_id = current_user.get("workspace_id", "")

    if not user_id:
        raise HTTPException(status_code=401, detail="User not identified")

    # Build signal payload
    signals = DriveSignals(
        goal_statement=body.goal_statement,
        autonomy_preference=body.autonomy_preference,
        job_title=body.job_title,
        industry=body.industry,
    )

    # Run inference
    service = get_service()
    bmy_request = BMYRequest(signals=signals)
    bmy_result = service.bmy(bmy_request)

    # Create or update profile
    profile_request = CreateProfileRequest(
        pi_profile=bmy_result.profile.profile_id,
        meta_archetype=bmy_result.profile.meta_archetype,
        confidence=bmy_result.confidence,
        drives=bmy_result.drives.model_dump(),
        source="member_onboarding",
        mags_config=bmy_result.otto_config.model_dump() if bmy_result.otto_config else {},
        workspace_config=bmy_result.workspace_config.model_dump()
        if bmy_result.workspace_config
        else {},
    )

    try:
        existing = profile_service.get_profile_by_user(db, user_id=user_id)
        if existing:
            # Update existing profile
            existing.pi_profile = profile_request.pi_profile
            existing.meta_archetype = profile_request.meta_archetype
            existing.confidence = profile_request.confidence
            existing.drives = profile_request.drives
            existing.source = "member_onboarding"
            existing.mags_config = profile_request.mags_config
            existing.workspace_config = profile_request.workspace_config
            db.commit()
            db.refresh(existing)
        else:
            profile_service.create_profile(db, user_id=user_id, request=profile_request)
            db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to save profile for member %s", user_id)

    # Build badge
    badge = get_badge_data(
        bmy_result.profile.meta_archetype,
        bmy_result.profile.profile_id,
        bmy_result.confidence,
    )

    # Auto-trigger sync if Google connection exists
    sync_triggered = False
    sync_result = None
    if workspace_id:
        google_conn = get_google_connection(db, user_id)
        if google_conn and google_conn.status == "connected":
            try:
                sync_result = await run_full_sync(db, user_id=user_id, workspace_id=workspace_id)
                sync_triggered = True
            except Exception:
                logger.exception("Auto-sync failed for member %s", user_id)

    return MemberInferResponse(
        profile_id=bmy_result.profile.profile_id,
        profile_name=bmy_result.profile.profile_name,
        meta_archetype=bmy_result.profile.meta_archetype,
        confidence=bmy_result.confidence,
        drives=bmy_result.drives.model_dump(),
        badge=badge,
        workspace_config=bmy_result.workspace_config.model_dump()
        if bmy_result.workspace_config
        else {},
        otto_config=bmy_result.otto_config.model_dump() if bmy_result.otto_config else {},
        sync_triggered=sync_triggered,
        sync_result=sync_result,
    )


# ---------------------------------------------------------------------------
# GET /onboarding/badge — get badge data for current user
# ---------------------------------------------------------------------------


@router.get("/badge")
async def get_badge(
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> dict:
    """Return persona badge data for the current user.

    Returns empty badge if no profile exists yet.
    """
    user_id = current_user.get("sub", "")
    profile = profile_service.get_profile_by_user(db, user_id=user_id)

    if profile is None:
        return {"has_badge": False, "badge": None}

    badge = get_badge_data(
        profile.meta_archetype,
        profile.pi_profile,
        profile.confidence,
    )

    return {
        "has_badge": True,
        "badge": badge,
        "profile_name": profile.pi_profile,
        "meta_archetype": profile.meta_archetype,
    }


# ---------------------------------------------------------------------------
# GET /onboarding/opening-move — resolve 3 personalized quick actions
# ---------------------------------------------------------------------------


class OpeningMoveAction(BaseModel):
    id: str
    title: str
    description: str
    output_type: str
    tag: str


class OpeningMoveResponse(BaseModel):
    hook_text: str
    actions: list[OpeningMoveAction]
    escape_text: str


@router.get("/opening-move")
async def get_opening_move(
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> OpeningMoveResponse:
    """Return 3 personalized quick actions for the current user.

    Resolves actions from the catalog using the user's meta_archetype
    and any available onboarding signals from the profile record.
    """
    user_id = current_user.get("sub", "")
    profile = profile_service.get_profile_by_user(db, user_id=user_id)

    if profile is None:
        raise HTTPException(status_code=404, detail="No profile found")

    # The signals column stores source-provenance metadata, not onboarding signals.
    # Extract what we can from mags_config and drives; accept sparse coverage.
    mags = profile.mags_config or {}
    signals: dict = {
        "meta_archetype": profile.meta_archetype,
        # mags_config may carry role/industry if persisted during onboarding
        "role": mags.get("role", ""),
        "industry": mags.get("industry", ""),
        "company_size": mags.get("company_size", ""),
        "seniority": mags.get("seniority", ""),
        "goals": mags.get("goals", []),
    }

    catalog_path = Path(settings.persona_repo_path) / "actions" / "catalog.yaml"
    resolver = ActionResolver(catalog_path=catalog_path)
    result = resolver.resolve(signals)

    return OpeningMoveResponse(**result.to_dict())
