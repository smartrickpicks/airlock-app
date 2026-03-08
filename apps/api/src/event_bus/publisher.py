"""Event bus publisher — routes events to target queues."""

import logging

import redis as redis_lib
from ulid import ULID

from src.config import settings
from src.event_bus.router import get_target_queues
from src.event_bus.schemas import CrossModuleEvent, EventBusJob, JobStatus

logger = logging.getLogger(__name__)

_redis: redis_lib.Redis | None = None


def _get_redis() -> redis_lib.Redis | None:
    global _redis  # noqa: PLW0603
    if _redis is None:
        try:
            _redis = redis_lib.Redis.from_url(settings.redis_url, decode_responses=True)
            _redis.ping()
        except Exception:
            logger.warning("Redis unavailable — event bus disabled")
            return None
    return _redis


def publish_event(event: CrossModuleEvent) -> list[str]:
    """Publish an event to all target queues. Returns list of job IDs."""
    targets = get_target_queues(event.event_type)
    if not targets:
        logger.debug("No routes for event type: %s", event.event_type)
        return []

    r = _get_redis()
    job_ids: list[str] = []

    for queue in targets:
        job_id = f"job_{ULID()}"
        job = EventBusJob(
            id=job_id,
            queue=queue,
            event_type=event.event_type,
            status=JobStatus.WAITING,
            payload={
                "event": event.model_dump(),
            },
        )

        if r:
            try:
                r.lpush(f"airlock:queue:{queue.value}", job.model_dump_json())
                r.incr(f"airlock:stats:{queue.value}:total")
                job_ids.append(job_id)
            except Exception:
                logger.exception("Failed to publish to queue %s", queue.value)
        else:
            # No Redis — log and continue
            logger.info("Event bus (no Redis): %s -> %s", event.event_type, queue.value)
            job_ids.append(job_id)

    logger.info(
        "Published %s to %d queues: %s", event.event_type, len(targets), [q.value for q in targets]
    )
    return job_ids
