"""Event bus monitoring — queue stats for admin dashboard."""

import logging

import redis as redis_lib

from src.config import settings
from src.event_bus.schemas import QueueName

logger = logging.getLogger(__name__)


def get_queue_stats() -> list[dict]:
    """Get stats for all queues. Returns mock data if Redis unavailable."""
    try:
        r = redis_lib.Redis.from_url(settings.redis_url, decode_responses=True)
        r.ping()

        stats = []
        for queue in QueueName:
            pending = r.llen(f"airlock:queue:{queue.value}") or 0
            total = int(r.get(f"airlock:stats:{queue.value}:total") or 0)
            failed = int(r.get(f"airlock:stats:{queue.value}:failed") or 0)
            dlq = r.llen(f"airlock:dlq:{queue.value}") or 0

            stats.append(
                {
                    "queue": queue.value,
                    "pending": pending,
                    "active": 0,
                    "completed": max(0, total - pending - failed),
                    "failed": failed,
                    "dlq_depth": dlq,
                    "events_per_second": 0.0,
                    "avg_duration_ms": 0.0,
                }
            )
        return stats

    except Exception:
        logger.info("Redis unavailable — returning mock queue stats")
        return _mock_queue_stats()


def get_recent_jobs(limit: int = 20) -> list[dict]:
    """Get recent jobs across all queues."""
    # When Redis is running, we'd pull from sorted sets
    # For now, return empty list (frontend falls back to mocks)
    return []


def get_dlq_entries() -> list[dict]:
    """Get dead letter queue entries."""
    return []


def get_event_flow(points: int = 30) -> list[dict]:
    """Get event flow time series data."""
    return []


def _mock_queue_stats() -> list[dict]:
    """Fallback mock stats matching frontend expectations."""
    return [
        {
            "queue": "crm-events",
            "pending": 3,
            "active": 1,
            "completed": 847,
            "failed": 2,
            "dlq_depth": 0,
            "events_per_second": 2.3,
            "avg_duration_ms": 45,
        },
        {
            "queue": "tasks-events",
            "pending": 7,
            "active": 2,
            "completed": 1203,
            "failed": 5,
            "dlq_depth": 1,
            "events_per_second": 4.1,
            "avg_duration_ms": 32,
        },
        {
            "queue": "calendar-events",
            "pending": 1,
            "active": 0,
            "completed": 412,
            "failed": 0,
            "dlq_depth": 0,
            "events_per_second": 0.8,
            "avg_duration_ms": 28,
        },
        {
            "queue": "notifications-events",
            "pending": 12,
            "active": 5,
            "completed": 3891,
            "failed": 8,
            "dlq_depth": 2,
            "events_per_second": 8.7,
            "avg_duration_ms": 15,
        },
        {
            "queue": "admin-events",
            "pending": 0,
            "active": 0,
            "completed": 156,
            "failed": 1,
            "dlq_depth": 0,
            "events_per_second": 0.3,
            "avg_duration_ms": 52,
        },
        {
            "queue": "analytics-events",
            "pending": 2,
            "active": 1,
            "completed": 2104,
            "failed": 3,
            "dlq_depth": 0,
            "events_per_second": 3.5,
            "avg_duration_ms": 20,
        },
    ]
