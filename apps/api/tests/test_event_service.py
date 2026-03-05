"""Unit tests for event service constants."""

from src.services.event import VALID_EVENT_TYPES


def test_valid_event_types():
    assert "vault_created" in VALID_EVENT_TYPES
    assert "chamber_advanced" in VALID_EVENT_TYPES
    assert "vault_archived" in VALID_EVENT_TYPES


def test_event_types_are_strings():
    for event_type in VALID_EVENT_TYPES:
        assert isinstance(event_type, str)
        assert len(event_type) > 0
