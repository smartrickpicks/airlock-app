"""Event emitter — publishes events to WebSocket + Redis."""

import json
import logging

import redis as redis_lib

from src.config import settings
from src.realtime.connection_manager import manager

logger = logging.getLogger(__name__)

_redis_client: redis_lib.Redis | None = None


def _get_redis() -> redis_lib.Redis | None:
    """Get Redis client, or None if unavailable."""
    global _redis_client  # noqa: PLW0603
    if _redis_client is None:
        try:
            _redis_client = redis_lib.Redis.from_url(settings.redis_url, decode_responses=True)
            _redis_client.ping()
        except Exception:
            logger.warning("Redis unavailable — real-time events will be local-only")
            _redis_client = None
    return _redis_client


async def emit_event(topic: str, event: dict) -> None:
    """Emit an event to local WebSocket connections and Redis pub/sub."""
    message = {
        "type": "event",
        "topic": topic,
        "event": event,
    }
    await manager.broadcast(topic, message)

    r = _get_redis()
    if r:
        try:
            r.publish(f"airlock:{topic}", json.dumps(message))
        except Exception:
            logger.warning("Redis publish failed for topic %s", topic)


async def emit_presence(
    workspace_id: str,
    user_id: str,
    status: str,
    current_page: str | None = None,
) -> None:
    """Emit a presence update."""
    event = {
        "type": "presence",
        "user_id": user_id,
        "status": status,
        "current_page": current_page,
    }
    await manager.broadcast(
        f"presence:{workspace_id}",
        {"type": "presence", "topic": f"presence:{workspace_id}", "event": event},
    )
