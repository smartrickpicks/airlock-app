"""Pydantic schemas for event request/response."""

from datetime import datetime

from pydantic import BaseModel


class EventResponse(BaseModel):
    id: str
    vault_id: str
    workspace_id: str
    event_type: str
    actor_id: str | None
    payload: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    events: list[EventResponse]
    total: int
