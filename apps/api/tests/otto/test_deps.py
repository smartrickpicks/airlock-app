"""Tests for OttoState dataclass."""

from src.otto.deps import OttoState


def test_otto_state_defaults():
    state = OttoState(
        user_id="usr_01",
        workspace_id="ws_01",
        org_role="member",
        module_roles={},
        surface="messenger",
        session_id="ots_01",
        messages=[],
    )
    assert state.archetype is None
    assert state.module is None
    assert state.vault_id is None
    assert state.active_recipe_id is None
    assert state.current_node_index is None
    assert state.vault_context is None
    assert state.can_execute_actions is False  # messenger default


def test_otto_state_task_runner():
    state = OttoState(
        user_id="usr_01",
        workspace_id="ws_01",
        org_role="builder",
        module_roles={"contracts": "builder"},
        surface="task_runner",
        session_id="ots_02",
        messages=[],
        archetype="analyst",
        module="contracts",
        chamber="review",
        vault_id="vlt_01",
        active_recipe_id="rcp_01",
        current_node_index=2,
        current_node={"type": "review", "config": {}, "gate_conditions": []},
    )
    assert state.can_execute_actions is True  # task_runner default
    assert state.archetype == "analyst"


def test_otto_state_post_init_defaults():
    """Verify __post_init__ sets mutable defaults correctly."""
    state = OttoState(
        user_id="usr_01",
        workspace_id="ws_01",
        org_role="member",
        module_roles={},
        session_id="ots_01",
    )
    assert state.messages == []
    assert state.enrichment_cache == {}
    assert state.can_execute_actions is False  # messenger is default surface
