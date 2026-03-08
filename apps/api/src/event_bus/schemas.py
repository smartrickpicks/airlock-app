"""Event bus schemas."""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class QueueName(StrEnum):
    CRM = "crm-events"
    TASKS = "tasks-events"
    CALENDAR = "calendar-events"
    NOTIFICATIONS = "notifications-events"
    ADMIN = "admin-events"
    ANALYTICS = "analytics-events"


class JobStatus(StrEnum):
    WAITING = "waiting"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    DELAYED = "delayed"


class CrossModuleEvent(BaseModel):
    id: str
    event_type: str
    workspace_id: str
    source_module: str
    source_vault_id: str | None = None
    source_event_id: str | None = None
    payload: dict = Field(default_factory=dict)
    actor_id: str | None = None
    actor_type: str = "system"  # human | system | ai
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    priority: int = 0


class EventBusJob(BaseModel):
    id: str
    queue: QueueName
    event_type: str
    status: JobStatus = JobStatus.WAITING
    payload: dict = Field(default_factory=dict)
    attempts: int = 0
    max_attempts: int = 3
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    completed_at: str | None = None
    error: str | None = None


class QueueStats(BaseModel):
    queue: QueueName
    pending: int = 0
    active: int = 0
    completed: int = 0
    failed: int = 0
    dlq_depth: int = 0
    events_per_second: float = 0.0
    avg_duration_ms: float = 0.0


class DLQEntry(BaseModel):
    id: str
    queue: QueueName
    event_type: str
    error: str
    payload: dict = Field(default_factory=dict)
    attempts: int = 3
    failed_at: str = Field(default_factory=lambda: datetime.now().isoformat())
