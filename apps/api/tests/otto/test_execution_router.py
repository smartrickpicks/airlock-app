"""Tests for Otto execution router — tier-based message routing."""

from src.otto.deps import OttoState
from src.otto.execution_router import ExecutionRouter
from src.otto.feature_gate import default_tier_config


def _make_state(**overrides) -> OttoState:
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


def test_deterministic_gate_status():
    router = ExecutionRouter(default_tier_config())
    state = _make_state(vault_id="vlt_01")
    result = router.route("what's the gate status?", state)
    assert result.tier == "deterministic"
    assert result.intent == "gate_status"


def test_cloud_for_complex_query():
    router = ExecutionRouter(default_tier_config())
    state = _make_state(vault_id="vlt_01")
    result = router.route("why is the health score dropping and what should I do?", state)
    assert result.tier == "cloud_llm"


def test_messenger_skips_deterministic_writes():
    router = ExecutionRouter(default_tier_config())
    state = _make_state(surface="messenger")
    result = router.route("I'm done, next step", state)
    # "node_advance" is a write action — messenger can't execute writes
    assert result.tier != "deterministic" or result.intent != "node_advance"


def test_disabled_tier_skipped():
    config = default_tier_config()
    config.tiers["deterministic"].enabled = False
    router = ExecutionRouter(config)
    state = _make_state(vault_id="vlt_01")
    result = router.route("what's the gate status?", state)
    assert result.tier == "cloud_llm"


def test_all_disabled_returns_error():
    config = default_tier_config()
    config.tiers["deterministic"].enabled = False
    config.tiers["cloud_llm"].enabled = False
    router = ExecutionRouter(config)
    state = _make_state()
    result = router.route("hello", state)
    assert result.tier == "error"
