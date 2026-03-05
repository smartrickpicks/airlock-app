"""Event routes — read-only access to the audit trail."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.schemas.event import EventListResponse, EventResponse
from src.services.event import list_events_for_vault, list_events_for_workspace

router = APIRouter(prefix="/api/v1/events", tags=["events"])


def _event_to_response(event) -> EventResponse:
    return EventResponse(
        id=event.id,
        vault_id=event.vault_id,
        workspace_id=event.workspace_id,
        event_type=event.event_type,
        actor_id=event.actor_id,
        payload=event.payload,
        created_at=event.created_at,
    )


@router.get("/vault/{vault_id}")
def get_vault_events(
    vault_id: str,
    limit: int = Query(default=50, ge=1, le=200),  # noqa: B008
    offset: int = Query(default=0, ge=0),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> EventListResponse:
    """Get events for a specific vault."""
    events = list_events_for_vault(db, vault_id, limit=limit, offset=offset)
    return EventListResponse(
        events=[_event_to_response(e) for e in events],
        total=len(events),
    )


@router.get("/recent")
def get_recent_events(
    limit: int = Query(default=20, ge=1, le=100),  # noqa: B008
    offset: int = Query(default=0, ge=0),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> EventListResponse:
    """Get recent events across the workspace."""
    workspace_id = current_user.get("workspace_id", "")
    events = list_events_for_workspace(db, workspace_id, limit=limit, offset=offset)
    return EventListResponse(
        events=[_event_to_response(e) for e in events],
        total=len(events),
    )
