"""Resolve custom domains to workspace configurations.

Used by the Next.js middleware (via /api/v1/workspaces/resolve endpoint)
and internally by multi-tenant routing logic.
"""

import json
import logging
import time

import redis as redis_lib
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config import settings
from src.models.workspace_config import WorkspaceConfig

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 300
CACHE_KEY_PREFIX = "domain:"

_redis_client: redis_lib.Redis | None = None
_redis_unavailable = False

# In-memory fallback cache: {domain: (config_dict, expiry_timestamp)}
_memory_cache: dict[str, tuple[dict, float]] = {}


def _get_redis() -> redis_lib.Redis | None:
    """Get Redis client, or None if unavailable."""
    global _redis_client, _redis_unavailable  # noqa: PLW0603
    if _redis_unavailable:
        return None
    if _redis_client is None:
        try:
            _redis_client = redis_lib.Redis.from_url(settings.redis_url, decode_responses=True)
            _redis_client.ping()
        except Exception:
            logger.warning("Redis unavailable — domain cache will use in-memory fallback")
            _redis_unavailable = True
            return None
    return _redis_client


def _config_to_cache_dict(config: WorkspaceConfig) -> dict:
    """Serialize a WorkspaceConfig to a JSON-safe dict for caching."""
    return {
        "id": config.id,
        "workspace_id": config.workspace_id,
        "custom_domain": config.custom_domain,
        "vercel_domain": config.vercel_domain,
        "domain_verified": config.domain_verified,
        "logo_url": config.logo_url,
        "accent_color": config.accent_color,
        "enabled_modules": config.enabled_modules,
        "ai_provider": config.ai_provider,
        "ai_tier": config.ai_tier,
        "billing_tier": config.billing_tier,
        "max_users": config.max_users,
        "max_vaults": config.max_vaults,
    }


def _get_cached(domain: str) -> dict | None:
    """Try to get a cached config dict from Redis, falling back to memory cache."""
    r = _get_redis()
    if r:
        try:
            raw = r.get(f"{CACHE_KEY_PREFIX}{domain}")
            if raw:
                return json.loads(raw)
        except Exception:
            logger.warning("Redis get failed for domain %s", domain)

    # In-memory fallback
    entry = _memory_cache.get(domain)
    if entry:
        data, expiry = entry
        if time.monotonic() < expiry:
            return data
        del _memory_cache[domain]

    return None


def _set_cached(domain: str, data: dict) -> None:
    """Cache a config dict in Redis and in-memory fallback."""
    r = _get_redis()
    if r:
        try:
            r.setex(f"{CACHE_KEY_PREFIX}{domain}", CACHE_TTL_SECONDS, json.dumps(data))
        except Exception:
            logger.warning("Redis set failed for domain %s", domain)

    # Always populate in-memory fallback
    _memory_cache[domain] = (data, time.monotonic() + CACHE_TTL_SECONDS)


async def resolve_domain(domain: str, db: Session) -> WorkspaceConfig | None:
    """Resolve a custom domain to its WorkspaceConfig.

    1. Checks cache (Redis -> in-memory fallback)
    2. Falls back to DB query on custom_domain where domain_verified is True
    3. Caches result on hit
    4. Returns None on miss
    """
    domain = domain.lower().strip()
    if not domain:
        return None

    # Check cache first
    cached = _get_cached(domain)
    if cached is not None:
        # Re-fetch from DB to return a proper ORM object
        stmt = select(WorkspaceConfig).where(WorkspaceConfig.id == cached["id"])
        return db.execute(stmt).scalar_one_or_none()

    # Query DB
    stmt = select(WorkspaceConfig).where(
        WorkspaceConfig.custom_domain == domain,
        WorkspaceConfig.domain_verified.is_(True),
        WorkspaceConfig.deleted_at.is_(None),
    )
    config = db.execute(stmt).scalar_one_or_none()

    if config is not None:
        _set_cached(domain, _config_to_cache_dict(config))

    return config


async def invalidate_domain_cache(domain: str) -> None:
    """Remove a domain from all caches. Call when workspace config changes."""
    domain = domain.lower().strip()

    r = _get_redis()
    if r:
        try:
            r.delete(f"{CACHE_KEY_PREFIX}{domain}")
        except Exception:
            logger.warning("Redis delete failed for domain %s", domain)

    _memory_cache.pop(domain, None)
