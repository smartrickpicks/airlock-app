"""Tests for execution tier config and feature flags."""

from src.otto.feature_gate import (
    default_tier_config,
    validate_tier_config,
)


def test_default_config_has_deterministic_and_cloud():
    config = default_tier_config()
    assert config.tiers["deterministic"].enabled is True
    assert config.tiers["local_llm"].enabled is False
    assert config.tiers["cloud_llm"].enabled is True
    assert config.fallback_order == ["deterministic", "local_llm", "cloud_llm"]


def test_validate_all_disabled_fails():
    config = default_tier_config()
    config.tiers["deterministic"].enabled = False
    config.tiers["cloud_llm"].enabled = False
    errors = validate_tier_config(config)
    assert any("at least one" in e.lower() for e in errors)


def test_validate_local_llm_without_url_fails():
    config = default_tier_config()
    config.tiers["local_llm"].enabled = True
    config.tiers["local_llm"].base_url = ""
    errors = validate_tier_config(config)
    assert any("base_url" in e for e in errors)


def test_validate_deterministic_only_warns():
    config = default_tier_config()
    config.tiers["cloud_llm"].enabled = False
    errors = validate_tier_config(config)
    assert any("WARN" in e for e in errors)
