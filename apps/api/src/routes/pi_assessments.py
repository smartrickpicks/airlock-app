"""PI assessment API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.schemas.pi_assessment import (
    CreatePIAssessmentRequest,
    PIAssessmentListResponse,
    PIAssessmentResponse,
    PIRecommendationResponse,
)
from src.services.pi_assessment import (
    compute_assessment_recommendation,
    create_pi_assessment,
    delete_pi_assessment,
    get_pi_assessment,
    list_pi_assessments,
)

router = APIRouter(prefix="/api/v1/pi", tags=["pi-assessments"])


def _assessment_to_response(a) -> PIAssessmentResponse:
    return PIAssessmentResponse(
        id=a.id,
        user_id=a.user_id,
        workspace_id=a.workspace_id,
        pi_profile=a.pi_profile,
        meta_archetype=a.meta_archetype,
        behavioral_factors=a.behavioral_factors,
        ux_preferences=a.ux_preferences,
        assessment_source=a.assessment_source,
        assessed_at=a.assessed_at,
        created_at=a.created_at,
    )


@router.get("/recommend/{pi_profile}")
def get_recommendation(
    pi_profile: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> PIRecommendationResponse:
    """Get PI role recommendation without saving an assessment."""
    rec = compute_assessment_recommendation(pi_profile)
    if rec is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid PI profile: {pi_profile}",
        )
    return PIRecommendationResponse(**rec)


@router.post("/users/{user_id}/assessment", status_code=status.HTTP_201_CREATED)
def create_assessment(
    user_id: str,
    body: CreatePIAssessmentRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> PIAssessmentResponse:
    """Create or update a PI assessment for a user."""
    workspace_id = current_user.get("workspace_id", "")
    try:
        assessment = create_pi_assessment(
            db,
            user_id=user_id,
            workspace_id=workspace_id,
            pi_profile=body.pi_profile,
            behavioral_factors=body.behavioral_factors,
            assessment_source=body.assessment_source,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None

    return _assessment_to_response(assessment)


@router.get("/users/{user_id}/assessment")
def get_user_assessment(
    user_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> PIAssessmentResponse:
    """Get the PI assessment for a specific user."""
    workspace_id = current_user.get("workspace_id", "")
    assessment = get_pi_assessment(db, user_id, workspace_id)
    if assessment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No PI assessment found for this user",
        )
    return _assessment_to_response(assessment)


@router.get("/assessments")
def list_assessments(
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> PIAssessmentListResponse:
    """List all PI assessments in the workspace."""
    workspace_id = current_user.get("workspace_id", "")
    assessments = list_pi_assessments(db, workspace_id)
    return PIAssessmentListResponse(
        assessments=[_assessment_to_response(a) for a in assessments],
        total=len(assessments),
    )


@router.delete("/users/{user_id}/assessment", status_code=status.HTTP_204_NO_CONTENT)
def remove_assessment(
    user_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> None:
    """Remove a PI assessment for a user."""
    workspace_id = current_user.get("workspace_id", "")
    deleted = delete_pi_assessment(db, user_id, workspace_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No PI assessment found for this user",
        )
