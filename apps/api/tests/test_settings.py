"""Unit tests for application Settings (config.py).

Tests cover:
- All required settings exist with correct types and defaults
- token_encryption_key defaults to empty string
- feature_billing defaults to False
- feature_billing can be overridden
"""

from src.config import Settings


class TestSettingsDefaults:
    def test_database_url_has_default(self):
        s = Settings()
        assert "postgresql" in s.database_url

    def test_redis_url_has_default(self):
        s = Settings()
        assert "redis" in s.redis_url

    def test_jwt_secret_has_default(self):
        s = Settings()
        assert s.jwt_secret != ""

    def test_jwt_algorithm_is_hs256(self):
        s = Settings()
        assert s.jwt_algorithm == "HS256"

    def test_jwt_access_expire_minutes_is_15(self):
        s = Settings()
        assert s.jwt_access_expire_minutes == 15

    def test_jwt_refresh_expire_days_is_7(self):
        s = Settings()
        assert s.jwt_refresh_expire_days == 7

    def test_token_encryption_key_defaults_to_empty(self, monkeypatch):
        monkeypatch.delenv("TOKEN_ENCRYPTION_KEY", raising=False)
        s = Settings(_env_file=None)
        assert s.token_encryption_key == ""

    def test_feature_billing_defaults_to_false(self, monkeypatch):
        monkeypatch.delenv("FEATURE_BILLING", raising=False)
        s = Settings(_env_file=None)
        assert s.feature_billing is False

    def test_debug_defaults_to_false(self, monkeypatch):
        monkeypatch.delenv("DEBUG", raising=False)
        s = Settings(_env_file=None)
        assert s.debug is False

    def test_environment_defaults_to_development(self):
        s = Settings()
        assert s.environment == "development"

    def test_cors_origins_is_list(self):
        s = Settings()
        assert isinstance(s.cors_origins, list)
        assert len(s.cors_origins) >= 1


class TestSettingsOverrides:
    def test_feature_billing_can_be_enabled(self, monkeypatch):
        monkeypatch.setenv("FEATURE_BILLING", "true")
        s = Settings()
        assert s.feature_billing is True

    def test_token_encryption_key_can_be_set(self, monkeypatch):
        monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", "test-key-value")
        s = Settings()
        assert s.token_encryption_key == "test-key-value"

    def test_debug_can_be_enabled(self, monkeypatch):
        monkeypatch.setenv("DEBUG", "true")
        s = Settings()
        assert s.debug is True
