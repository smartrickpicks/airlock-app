"""Event emitter — publishes events to WebSocket + Redis."""

import asyncio
import json
import logging
import threading
import time as time_mod

import redis as redis_lib

from src.config import settings
from src.realtime.connection_manager import manager

logger = logging.getLogger(__name__)

_redis_client: redis_lib.Redis | None = None
_redis_lock = threading.Lock()


def _get_redis() -> redis_lib.Redis | None:
    """Get Redis client, or None if unavailable. Thread-safe."""
    global _redis_client  # noqa: PLW0603
    if _redis_client is not None:
        return _redis_client
    with _redis_lock:
        if _redis_client is not None:
            return _redis_client
        try:
            _redis_client = redis_lib.Redis.from_url(settings.redis_url, decode_responses=True)
            _redis_client.ping()
        except Exception:
            logger.warning("Redis unavailable — real-time events will be local-only")
            _redis_client = None
    return _redis_client


def _publish_to_redis(topic: str, message: dict) -> None:
    """Get Redis client and publish — all sync, safe for to_thread."""
    r = _get_redis()
    if r:
        r.publish(f"airlock:{topic}", json.dumps(message))


async def emit_event(topic: str, event: dict) -> None:
    """Emit an event to local WebSocket connections and Redis pub/sub."""
    message = {
        "type": "event",
        "topic": topic,
        "event": event,
    }
    await manager.broadcast(topic, message)

    try:
        await asyncio.to_thread(_publish_to_redis, topic, message)
    except Exception:
        logger.warning("Redis publish failed for topic %s", topic)


async def emit_domain_event(
    topic: str,
    event_type: str,
    payload: dict,
    workspace_id: str,
    actor_id: str | None = None,
) -> None:
    """Emit a structured domain event with standard envelope."""
    event = {
        "event_type": event_type,
        "workspace_id": workspace_id,
        "actor_id": actor_id,
        "payload": payload,
        "timestamp": time_mod.time(),
    }
    await emit_event(topic, event)


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
