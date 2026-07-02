"""Resolve custom domains to workspace configurations.

Used by the Next.js middleware (via /api/v1/workspaces/resolve endpoint)
and internally by multi-tenant routing logic.
"""

import json
import logging
import time
from collections import OrderedDict

import redis as redis_lib
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config import settings
from src.models.workspace_config import WorkspaceConfig

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 300
CACHE_KEY_PREFIX = "domain:"
MEMORY_CACHE_MAX_SIZE = 10_000
REDIS_RETRY_INTERVAL_SECONDS = 30

_redis_pool: redis_lib.ConnectionPool | None = None
_redis_unavailable = False
_redis_last_retry: float = 0.0


class _BoundedTTLCache:
    """LRU cache with TTL and max size. Evicts oldest entries when full."""

    def __init__(self, maxsize: int = MEMORY_CACHE_MAX_SIZE) -> None:
        self._maxsize = maxsize
        self._data: OrderedDict[str, tuple[dict, float]] = OrderedDict()

    def get(self, key: str) -> dict | None:
        entry = self._data.get(key)
        if entry is None:
            return None
        data, expiry = entry
        if time.monotonic() > expiry:
            del self._data[key]
            return None
        self._data.move_to_end(key)
        return data

    def set(self, key: str, data: dict, ttl: float = CACHE_TTL_SECONDS) -> None:
        if key in self._data:
            self._data.move_to_end(key)
        self._data[key] = (data, time.monotonic() + ttl)
        while len(self._data) > self._maxsize:
            self._data.popitem(last=False)

    def delete(self, key: str) -> None:
        self._data.pop(key, None)

    def __contains__(self, key: str) -> bool:
        entry = self._data.get(key)
        if entry is None:
            return False
        _, expiry = entry
        if time.monotonic() > expiry:
            del self._data[key]
            return False
        return True

    def clear(self) -> None:
        self._data.clear()


_memory_cache = _BoundedTTLCache()


def _get_redis() -> redis_lib.Redis | None:
    """Get Redis client via connection pool, or None if unavailable. Retries after interval."""
    global _redis_pool, _redis_unavailable, _redis_last_retry  # noqa: PLW0603
    if _redis_unavailable:
        if time.monotonic() - _redis_last_retry < REDIS_RETRY_INTERVAL_SECONDS:
            return None
        _redis_last_retry = time.monotonic()
        try:
            _redis_pool = redis_lib.ConnectionPool.from_url(
                settings.redis_url, max_connections=10, decode_responses=True
            )
            client = redis_lib.Redis(connection_pool=_redis_pool)
            client.ping()
            _redis_unavailable = False
            logger.info("Redis connection restored")
        except Exception:
            _redis_pool = None
            return None
    if _redis_pool is None:
        try:
            _redis_pool = redis_lib.ConnectionPool.from_url(
                settings.redis_url, max_connections=10, decode_responses=True
            )
            client = redis_lib.Redis(connection_pool=_redis_pool)
            client.ping()
        except Exception:
            logger.warning("Redis unavailable — domain cache will use in-memory fallback")
            _redis_pool = None
            _redis_unavailable = True
            _redis_last_retry = time.monotonic()
            return None
    return redis_lib.Redis(connection_pool=_redis_pool)


def _config_to_cache_dict(config: WorkspaceConfig) -> dict:
    """Serialize a WorkspaceConfig to a JSON-safe dict for caching.

    Excludes encrypted fields — only public data for routing/rendering.
    """
    # Only cache fields needed for routing/rendering — never billing data
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

    return _memory_cache.get(domain)


def _set_cached(domain: str, data: dict) -> None:
    """Cache a config dict in Redis and in-memory fallback."""
    r = _get_redis()
    if r:
        try:
            r.setex(f"{CACHE_KEY_PREFIX}{domain}", CACHE_TTL_SECONDS, json.dumps(data))
        except Exception:
            logger.warning("Redis set failed for domain %s", domain)

    _memory_cache.set(domain, data)


async def resolve_domain(domain: str, db: Session) -> WorkspaceConfig | None:
    """Resolve a custom domain to its WorkspaceConfig.

    1. Checks cache (Redis -> in-memory fallback)
    2. On cache hit: returns a detached WorkspaceConfig from cached data (no DB query)
    3. On cache miss: queries DB, caches on hit
    4. Returns None on miss
    """
    domain = domain.lower().strip()
    if not domain:
        return None

    # Cache hit — construct detached object, skip DB
    cached = _get_cached(domain)
    if cached is not None:
        config = WorkspaceConfig()
        for key, value in cached.items():
            setattr(config, key, value)
        return config

    # Cache miss — query DB with full safety filters
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

    _memory_cache.delete(domain)
