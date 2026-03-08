"""Shared fixtures for Otto tests."""

import pytest

from src.otto.deps import OttoState


@pytest.fixture
def make_state():
    """Factory fixture for creating OttoState with sensible defaults."""

    def _make(**overrides) -> OttoState:
        defaults = dict(
            user_id="usr_01",
            workspace_id="ws_01",
            org_role="member",
            module_roles={},
            surface="task_runner",
            session_id="ots_01",
            messages=[],
        )
        defaults.update(overrides)
        return OttoState(**defaults)

    return _make
