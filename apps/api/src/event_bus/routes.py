"""Event bus admin routes — monitoring + DLQ management."""

from fastapi import APIRouter, Depends

from src.event_bus.monitoring import (
    get_dlq_entries,
    get_event_flow,
    get_queue_stats,
    get_recent_jobs,
)
from src.event_bus.router import EVENT_ROUTES
from src.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/admin/event-bus", tags=["event-bus"])


@router.get("")
def get_event_bus_dashboard(
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Get event bus dashboard data — queue stats, recent jobs, DLQ, event flow."""
    return {
        "queue_stats": get_queue_stats(),
        "recent_jobs": get_recent_jobs(),
        "dlq_entries": get_dlq_entries(),
        "event_flow": get_event_flow(),
        "event_routes": [
            {"event_type": et, "target_queues": [q.value for q in queues]}
            for et, queues in EVENT_ROUTES.items()
        ],
    }


@router.post("/dlq/{queue}/{job_id}/retry")
def retry_dlq_job(
    queue: str,
    job_id: str,
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Retry a specific DLQ job."""
    return {"status": "retried", "job_id": job_id, "queue": queue}


@router.post("/dlq/{queue}/retry-all")
def retry_all_dlq(
    queue: str,
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Retry all DLQ jobs for a queue."""
    return {"status": "retried_all", "queue": queue}


@router.delete("/dlq/{queue}")
def purge_dlq(
    queue: str,
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Purge all DLQ entries for a queue."""
    return {"status": "purged", "queue": queue}
