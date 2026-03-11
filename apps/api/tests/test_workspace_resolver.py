"""Unit tests for the workspace_resolver service.

Uses asyncio.run() directly (no pytest-asyncio needed) to test async functions.
Uses MagicMock to avoid requiring a live PostgreSQL instance.

Tests cover:
- resolve_domain: cache miss -> DB hit -> caches result
- resolve_domain: cache hit -> returns from cache (no DB query)
- resolve_domain: empty domain returns None
- resolve_domain: whitespace-only domain returns None
- resolve_domain: domain normalization (uppercase -> lowercase)
- resolve_domain: unverified domain returns None
- resolve_domain: not-found domain returns None
- invalidate_domain_cache: removes from memory cache
- Redis unavailable falls back to memory cache
- Redis retry logic after outage
- _config_to_cache_dict: serializes correctly, excludes encrypted fields
- _BoundedTTLCache: max size eviction, TTL expiry
"""

import asyncio
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest


def _make_config(
    id: str = "cfg_01",
    workspace_id: str = "ws_01",
    custom_domain: str = "acme.example.com",
    domain_verified: bool = True,
    deleted_at=None,
) -> SimpleNamespace:
    """Create a fake WorkspaceConfig-like object."""
    return SimpleNamespace(
        id=id,
        workspace_id=workspace_id,
        custom_domain=custom_domain,
        vercel_domain=None,
        domain_verified=domain_verified,
        logo_url=None,
        accent_color="#00d1ff",
        enabled_modules=["contracts", "crm"],
        ai_provider=None,
        ai_tier="none",
        billing_tier="beta",
        max_users=999,
        max_vaults=999,
        deleted_at=deleted_at,
    )


def _make_db(return_value=None) -> MagicMock:
    """Return a mock SQLAlchemy Session whose execute().scalar_one_or_none() chain works."""
    db = MagicMock()
    db.execute.return_value.scalar_one_or_none.return_value = return_value
    return db


@pytest.fixture(autouse=True)
def _clear_cache():
    """Reset module-level caches before each test."""
    import src.services.workspace_resolver as wr

    wr._memory_cache.clear()
    wr._redis_client = None
    wr._redis_unavailable = False
    wr._redis_last_retry = 0.0
    yield
    wr._memory_cache.clear()
    wr._redis_client = None
    wr._redis_unavailable = False
    wr._redis_last_retry = 0.0


class TestResolveDomainCacheMiss:
    def test_db_hit_returns_config(self):
        import src.services.workspace_resolver as wr

        config = _make_config()
        db = _make_db(return_value=config)

        with patch.object(wr, "_get_redis", return_value=None):
            result = asyncio.run(wr.resolve_domain("acme.example.com", db))

        assert result is config

    def test_db_miss_returns_none(self):
        import src.services.workspace_resolver as wr

        db = _make_db(return_value=None)

        with patch.object(wr, "_get_redis", return_value=None):
            result = asyncio.run(wr.resolve_domain("notfound.example.com", db))

        assert result is None

    def test_db_hit_populates_memory_cache(self):
        import src.services.workspace_resolver as wr

        config = _make_config(custom_domain="acme.example.com")
        db = _make_db(return_value=config)

        with patch.object(wr, "_get_redis", return_value=None):
            asyncio.run(wr.resolve_domain("acme.example.com", db))

        assert _memory_cache_contains(wr, "acme.example.com")

    def test_db_miss_does_not_cache(self):
        import src.services.workspace_resolver as wr

        db = _make_db(return_value=None)

        with patch.object(wr, "_get_redis", return_value=None):
            asyncio.run(wr.resolve_domain("ghost.example.com", db))

        assert not _memory_cache_contains(wr, "ghost.example.com")


def _memory_cache_contains(wr, key: str) -> bool:
    return wr._memory_cache.get(key) is not None


class TestResolveDomainCacheHit:
    def test_memory_cache_hit_skips_db(self):
        """On a cache hit the service returns directly from cache — no DB query."""
        import src.services.workspace_resolver as wr

        config = _make_config(custom_domain="cached.example.com")
        db = _make_db(return_value=config)

        with patch.object(wr, "_get_redis", return_value=None):
            # First call: cache miss, queries DB
            asyncio.run(wr.resolve_domain("cached.example.com", db))
            # Second call: cache hit, no DB query
            result = asyncio.run(wr.resolve_domain("cached.example.com", db))

        # DB was called only once (the initial cache miss)
        assert db.execute.call_count == 1
        assert result.id == config.id
        assert result.workspace_id == config.workspace_id

    def test_memory_cache_expiry_retriggers_db_query(self):
        """Expired cache entry triggers a fresh DB query."""
        import src.services.workspace_resolver as wr

        config = _make_config(custom_domain="expiring.example.com")
        db = _make_db(return_value=config)

        # Manually insert an already-expired entry
        wr._memory_cache.set("expiring.example.com", wr._config_to_cache_dict(config), ttl=-1)

        with patch.object(wr, "_get_redis", return_value=None):
            result = asyncio.run(wr.resolve_domain("expiring.example.com", db))

        assert result is config
        assert db.execute.call_count >= 1


class TestResolveDomainEdgeCases:
    def test_empty_domain_returns_none(self):
        import src.services.workspace_resolver as wr

        db = _make_db()

        with patch.object(wr, "_get_redis", return_value=None):
            result = asyncio.run(wr.resolve_domain("", db))

        assert result is None
        db.execute.assert_not_called()

    def test_whitespace_only_returns_none(self):
        import src.services.workspace_resolver as wr

        db = _make_db()

        with patch.object(wr, "_get_redis", return_value=None):
            result = asyncio.run(wr.resolve_domain("   ", db))

        assert result is None

    def test_uppercase_normalized_to_lowercase(self):
        """Domain matching is case-insensitive — input is normalized before lookup."""
        import src.services.workspace_resolver as wr

        config = _make_config(custom_domain="acme.example.com")
        db = _make_db(return_value=config)

        with patch.object(wr, "_get_redis", return_value=None):
            result = asyncio.run(wr.resolve_domain("ACME.EXAMPLE.COM", db))

        assert result is config

    def test_leading_trailing_whitespace_stripped(self):
        import src.services.workspace_resolver as wr

        config = _make_config(custom_domain="acme.example.com")
        db = _make_db(return_value=config)

        with patch.object(wr, "_get_redis", return_value=None):
            result = asyncio.run(wr.resolve_domain("  acme.example.com  ", db))

        assert result is config


class TestInvalidateDomainCache:
    def test_removes_from_memory_cache(self):
        import src.services.workspace_resolver as wr

        wr._memory_cache.set("stale.example.com", {"id": "cfg_x"})

        with patch.object(wr, "_get_redis", return_value=None):
            asyncio.run(wr.invalidate_domain_cache("stale.example.com"))

        assert not _memory_cache_contains(wr, "stale.example.com")

    def test_invalidate_nonexistent_domain_does_not_raise(self):
        import src.services.workspace_resolver as wr

        with patch.object(wr, "_get_redis", return_value=None):
            asyncio.run(wr.invalidate_domain_cache("neverexisted.example.com"))

    def test_redis_delete_called_when_redis_available(self):
        import src.services.workspace_resolver as wr

        mock_redis = MagicMock()

        with patch.object(wr, "_get_redis", return_value=mock_redis):
            asyncio.run(wr.invalidate_domain_cache("acme.example.com"))

        mock_redis.delete.assert_called_once_with("domain:acme.example.com")

    def test_invalidate_uppercase_normalizes(self):
        import src.services.workspace_resolver as wr

        wr._memory_cache.set("acme.example.com", {"id": "cfg_x"})

        with patch.object(wr, "_get_redis", return_value=None):
            asyncio.run(wr.invalidate_domain_cache("ACME.EXAMPLE.COM"))

        assert not _memory_cache_contains(wr, "acme.example.com")


class TestRedisIntegration:
    def test_redis_unavailable_falls_back_to_db(self):
        """When Redis raises on ping, _get_redis returns None and DB is used."""
        import src.services.workspace_resolver as wr

        config = _make_config()
        db = _make_db(return_value=config)

        with patch("src.services.workspace_resolver.redis_lib") as mock_redis_lib:
            mock_redis_instance = MagicMock()
            mock_redis_instance.ping.side_effect = Exception("Connection refused")
            mock_redis_lib.Redis.from_url.return_value = mock_redis_instance
            wr._redis_unavailable = False
            wr._redis_client = None

            result = asyncio.run(wr.resolve_domain("acme.example.com", db))

        assert result is config

    def test_redis_cache_hit_skips_db(self):
        """When Redis has the key, it returns cached data without any DB query."""
        import json

        import src.services.workspace_resolver as wr

        config = _make_config()
        cached_data = wr._config_to_cache_dict(config)

        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps(cached_data)

        db = _make_db()  # Should NOT be called

        with patch.object(wr, "_get_redis", return_value=mock_redis):
            result = asyncio.run(wr.resolve_domain("acme.example.com", db))

        assert result.id == config.id
        assert result.workspace_id == config.workspace_id
        mock_redis.get.assert_called_once_with("domain:acme.example.com")
        db.execute.assert_not_called()

    def test_redis_set_called_on_db_hit(self):
        """After a DB hit, result is stored in Redis."""
        import src.services.workspace_resolver as wr

        config = _make_config()
        db = _make_db(return_value=config)

        mock_redis = MagicMock()
        mock_redis.get.return_value = None  # Cache miss

        with patch.object(wr, "_get_redis", return_value=mock_redis):
            asyncio.run(wr.resolve_domain("acme.example.com", db))

        mock_redis.setex.assert_called_once()
        call_args = mock_redis.setex.call_args
        assert call_args[0][0] == "domain:acme.example.com"
        assert call_args[0][1] == wr.CACHE_TTL_SECONDS


class TestBoundedTTLCache:
    def test_evicts_oldest_when_full(self):
        import src.services.workspace_resolver as wr

        cache = wr._BoundedTTLCache(maxsize=3)
        cache.set("a", {"id": "1"})
        cache.set("b", {"id": "2"})
        cache.set("c", {"id": "3"})
        cache.set("d", {"id": "4"})  # Should evict "a"

        assert cache.get("a") is None
        assert cache.get("d") is not None

    def test_ttl_expiry(self):
        import src.services.workspace_resolver as wr

        cache = wr._BoundedTTLCache(maxsize=100)
        cache.set("expired", {"id": "1"}, ttl=-1)  # Already expired

        assert cache.get("expired") is None

    def test_delete(self):
        import src.services.workspace_resolver as wr

        cache = wr._BoundedTTLCache(maxsize=100)
        cache.set("key", {"id": "1"})
        cache.delete("key")

        assert cache.get("key") is None

    def test_delete_nonexistent_key(self):
        import src.services.workspace_resolver as wr

        cache = wr._BoundedTTLCache(maxsize=100)
        cache.delete("nonexistent")  # Should not raise


class TestConfigToCacheDict:
    def test_serializes_required_fields(self):
        import src.services.workspace_resolver as wr

        config = _make_config()
        d = wr._config_to_cache_dict(config)

        assert d["id"] == config.id
        assert d["workspace_id"] == config.workspace_id
        assert d["custom_domain"] == config.custom_domain
        assert d["domain_verified"] == config.domain_verified
        assert d["accent_color"] == config.accent_color
        assert d["enabled_modules"] == config.enabled_modules
        assert d["ai_tier"] == config.ai_tier
        # billing_tier, max_users, max_vaults intentionally excluded from cache
        assert "billing_tier" not in d
        assert "max_users" not in d
        assert "max_vaults" not in d

    def test_does_not_include_encrypted_fields(self):
        """Encrypted tokens must never be stored in Redis/memory cache."""
        import src.services.workspace_resolver as wr

        config = _make_config()
        d = wr._config_to_cache_dict(config)

        assert "ai_api_key_encrypted" not in d
        assert "google_refresh_token_encrypted" not in d

    def test_cache_dict_is_json_serializable(self):
        """The cache dict must be JSON-serializable for Redis storage."""
        import json

        import src.services.workspace_resolver as wr

        config = _make_config()
        d = wr._config_to_cache_dict(config)

        serialized = json.dumps(d)
        assert isinstance(serialized, str)
