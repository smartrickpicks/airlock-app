"""Event service — append-only event creation and querying."""

from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.event import Event

VALID_EVENT_TYPES = (
    "vault_created",
    "vault_updated",
    "chamber_advanced",
    "vault_archived",
    "member_added",
    "member_removed",
    "gate_cleared",
    "extraction_complete",
)


def create_event(
    db: Session,
    *,
    vault_id: str,
    workspace_id: str,
    event_type: str,
    actor_id: str | None = None,
    payload: dict | None = None,
) -> Event:
    """Create an immutable event record. Events are never updated or deleted."""
    event = Event(
        id=str(ULID()),
        vault_id=vault_id,
        workspace_id=workspace_id,
        event_type=event_type,
        actor_id=actor_id,
        payload=payload or {},
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def list_events_for_vault(
    db: Session,
    vault_id: str,
    *,
    limit: int = 50,
    offset: int = 0,
) -> list[Event]:
    """Get events for a specific vault, newest first."""
    stmt = (
        select(Event)
        .where(Event.vault_id == vault_id)
        .order_by(Event.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.execute(stmt).scalars().all())


def list_events_for_workspace(
    db: Session,
    workspace_id: str,
    *,
    limit: int = 50,
    offset: int = 0,
) -> list[Event]:
    """Get recent events across the entire workspace, newest first."""
    stmt = (
        select(Event)
        .where(Event.workspace_id == workspace_id)
        .order_by(Event.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.execute(stmt).scalars().all())
