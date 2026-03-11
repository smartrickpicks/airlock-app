"""Notification routes — derived from events table for the notification center."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db import get_db
from src.messenger.notification_models import NotificationPreferences
from src.middleware.auth import get_current_user
from src.models.event import Event

# ─── Pydantic Schemas ────────────────────────────────────────────────

class NotificationPreferencesResponse(BaseModel):
    """Response schema for notification preferences."""

    user_id: str
    toast_enabled: bool
    toast_otto: bool
    toast_people: bool
    sound_enabled: bool
    sound_send: str
    sound_receive: str
    sound_notification: str
    overlay_default: bool

    model_config = {"from_attributes": True}


class NotificationPreferencesUpdate(BaseModel):
    """Partial update schema for notification preferences."""

    toast_enabled: bool | None = None
    toast_otto: bool | None = None
    toast_people: bool | None = None
    sound_enabled: bool | None = None
    sound_send: str | None = None
    sound_receive: str | None = None
    sound_notification: str | None = None
    overlay_default: bool | None = None

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])

# Map event types to notification shape
_EVENT_CATEGORY: dict[str, str] = {
    "vault_created": "contract",
    "vault_updated": "contract",
    "vault_archived": "contract",
    "chamber_advanced": "contract",
    "gate_cleared": "contract",
    "patch_created": "contract",
    "patch_submitted": "contract",
    "patch_approved": "contract",
    "patch_rejected": "contract",
    "extraction_complete": "contract",
    "document_uploaded": "document",
    "task_created": "task",
    "task_assigned": "task",
    "crm_entity_created": "crm",
    "calendar_event_created": "calendar",
}

_EVENT_TYPE_MAP: dict[str, str] = {
    "patch_approved": "success",
    "patch_rejected": "warning",
    "chamber_advanced": "success",
    "gate_cleared": "success",
    "extraction_complete": "info",
}


def _event_to_notification(event: Event) -> dict:
    payload = event.payload or {}
    category = _EVENT_CATEGORY.get(event.event_type, "system")
    ntype = _EVENT_TYPE_MAP.get(event.event_type, "info")
    title = event.event_type.replace("_", " ").title()
    body = payload.get("summary", payload.get("field_key", ""))

    return {
        "id": event.id,
        "title": title,
        "body": body,
        "type": ntype,
        "category": category,
        "module": category if category != "system" else None,
        "href": f"/contracts/{event.vault_id}" if event.vault_id else None,
        "read": False,
        "createdAt": event.created_at.isoformat() if event.created_at else "",
    }


@router.get("")
async def list_notifications(
    limit: int = Query(default=50, ge=1, le=200),  # noqa: B008
    since_days: int = Query(default=7, ge=1, le=90),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Return recent events as notifications for the notification center."""
    workspace_id = current_user.get("workspace_id", "")
    cutoff = datetime.now(UTC) - timedelta(days=since_days)

    stmt = (
        select(Event)
        .where(Event.workspace_id == workspace_id)
        .where(Event.created_at >= cutoff)
        .order_by(Event.created_at.desc())
        .limit(limit)
    )

    events = db.execute(stmt).scalars().all()

    return {
        "notifications": [_event_to_notification(e) for e in events],
        "total": len(events),
    }


# ─── Notification Preferences Endpoints ──────────────────────────────


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    db: Session = Depends(get_db),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> NotificationPreferencesResponse:
    """Fetch user notification preferences, creating defaults if not found."""
    user_id = current_user.get("sub", "")

    prefs = db.execute(
        select(NotificationPreferences).where(
            NotificationPreferences.user_id == user_id
        )
    ).scalar_one_or_none()

    if prefs is None:
        prefs = NotificationPreferences(user_id=user_id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    return NotificationPreferencesResponse.model_validate(prefs)


@router.patch("/preferences", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    body: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> NotificationPreferencesResponse:
    """Update user notification preferences (partial update)."""
    user_id = current_user.get("sub", "")

    prefs = db.execute(
        select(NotificationPreferences).where(
            NotificationPreferences.user_id == user_id
        )
    ).scalar_one_or_none()

    if prefs is None:
        prefs = NotificationPreferences(user_id=user_id)
        db.add(prefs)
        db.flush()

    updates = body.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(prefs, field, value)

    db.commit()
    db.refresh(prefs)

    return NotificationPreferencesResponse.model_validate(prefs)
