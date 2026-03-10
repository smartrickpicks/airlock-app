"""Calendar sync routes."""

from fastapi import APIRouter, Header
from pydantic import BaseModel

from src.services.calendar import sync_google_calendar

router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])


class CalendarEvent(BaseModel):
    google_event_id: str | None = None
    title: str
    description: str | None = None
    start_at: str
    end_at: str
    location: str | None = None
    attendees: list[dict] = []
    source: str = "google_calendar"


class SyncResponse(BaseModel):
    events: list[CalendarEvent]
    count: int
    synced: bool


@router.post("/sync", response_model=SyncResponse)
async def sync_calendar(
    authorization: str = Header(default=""),  # noqa: B008
):
    """Sync Google Calendar events for the authenticated user."""
    token = authorization.replace("Bearer ", "") if authorization else ""
    events = await sync_google_calendar(token)
    return SyncResponse(
        events=[CalendarEvent(**e) for e in events],
        count=len(events),
        synced=True,
    )


@router.get("/events", response_model=SyncResponse)
async def list_events():
    """List synced calendar events (returns mock for demo)."""
    events = await sync_google_calendar("")
    return SyncResponse(
        events=[CalendarEvent(**e) for e in events],
        count=len(events),
        synced=True,
    )
