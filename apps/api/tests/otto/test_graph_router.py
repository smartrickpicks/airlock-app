"""Tests for OttoRouter — deterministic dispatch to sub-agent nodes."""

from src.otto.deps import OttoState
from src.otto.graph.router import resolve_agent_type


def _make_state(**overrides) -> OttoState:
    defaults = dict(
        user_id="usr_01",
        workspace_id="ws_01",
        org_role="member",
        module_roles={},
        surface="messenger",
        session_id="ots_01",
        messages=[],
    )
    defaults.update(overrides)
    return OttoState(**defaults)


def test_conductor_on_admin_routes_to_conductor():
    state = _make_state(org_role="conductor", surface="task_runner", module="admin")
    assert resolve_agent_type(state) == "conductor"


def test_owner_on_admin_routes_to_conductor():
    state = _make_state(org_role="owner", surface="task_runner", module="admin")
    assert resolve_agent_type(state) == "conductor"


def test_task_runner_with_recipe_routes_to_recipe():
    state = _make_state(
        surface="task_runner",
        active_recipe_id="rcp_01",
        current_node={"type": "review", "config": {}, "gate_conditions": []},
    )
    assert resolve_agent_type(state) == "recipe"


def test_vault_without_recipe_routes_to_vault():
    state = _make_state(vault_id="vlt_01")
    assert resolve_agent_type(state) == "vault"


def test_messenger_no_vault_routes_to_general():
    state = _make_state(surface="messenger")
    assert resolve_agent_type(state) == "general"


def test_member_on_admin_routes_to_general_not_conductor():
    state = _make_state(org_role="member", surface="task_runner", module="admin")
    assert resolve_agent_type(state) == "general"
