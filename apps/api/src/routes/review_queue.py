"""Review queue routes — gatekeeper cross-vault dashboard."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.services.review_queue import build_review_queue

router = APIRouter(prefix="/api/v1/contracts", tags=["review-queue"])


@router.get("/review-queue")
def get_review_queue(
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> dict:
    """Return the review queue aggregation for the current workspace."""
    workspace_id = current_user.get("workspace_id", "")
    return build_review_queue(db, workspace_id)
