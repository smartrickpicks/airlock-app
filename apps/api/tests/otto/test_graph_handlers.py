"""Tests for deterministic graph handlers — Task 2.4."""

from src.otto.deps import OttoState
from src.otto.deterministic import DeterministicResult
from src.otto.graph.handlers import (
    handle_field_summary,
    handle_gate_status,
    handle_node_advance,
    handle_recipe_progress,
)


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


def test_handle_gate_status_returns_text():
    state = _make_state(
        vault_id="vlt_01",
        vault_context={"gate_color": "yellow", "health_score": 0.72},
    )
    result = handle_gate_status(state)
    assert isinstance(result, DeterministicResult)
    assert "yellow" in result.text.lower() or "72" in result.text


def test_handle_field_summary_returns_counts():
    state = _make_state(
        vault_id="vlt_01",
        vault_context={"pass_count": 37, "fail_count": 5, "review_count": 12},
    )
    result = handle_field_summary(state)
    assert "37" in result.text
    assert "5" in result.text


def test_handle_recipe_progress():
    state = _make_state(
        active_recipe_id="rcp_01",
        current_node_index=2,
        total_recipe_nodes=8,
        current_node={
            "type": "review",
            "config": {"description": "Review health"},
            "gate_conditions": [],
        },
    )
    result = handle_recipe_progress(state)
    assert "3" in result.text  # node_index + 1
    assert "8" in result.text


def test_handle_node_advance_all_pass():
    state = _make_state(
        active_recipe_id="rcp_01",
        current_node_index=2,
        total_recipe_nodes=8,
        current_node={"type": "review", "config": {}, "gate_conditions": []},
    )
    # No gate conditions → auto-pass
    result = handle_node_advance(state)
    assert result.advanced is True
    assert state.current_node_index == 3


def test_handle_node_advance_blocked():
    state = _make_state(
        active_recipe_id="rcp_01",
        current_node_index=2,
        total_recipe_nodes=8,
        current_node={
            "type": "review",
            "config": {},
            "gate_conditions": [
                {
                    "type": "field_value",
                    "field": "territory",
                    "expected": "Worldwide",
                    "actual": None,
                }
            ],
        },
    )
    result = handle_node_advance(state)
    assert result.advanced is False
    assert state.current_node_index == 2  # Not changed
