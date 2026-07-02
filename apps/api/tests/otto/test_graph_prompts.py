from src.otto.deps import OttoState
from src.otto.graph.prompts import (
    build_conductor_prompt,
    build_general_prompt,
    build_recipe_prompt,
    build_vault_prompt,
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


def test_recipe_prompt_includes_node_info():
    state = _make_state(
        archetype="analyst",
        active_recipe_id="rcp_01",
        current_node_index=2,
        total_recipe_nodes=8,
        current_node={
            "type": "review",
            "config": {"description": "Review health score"},
            "gate_conditions": [],
        },
    )
    prompt = build_recipe_prompt(state)
    assert "step 3" in prompt.lower() or "3/8" in prompt or "3 of 8" in prompt
    assert "review" in prompt.lower()
    assert "analyst" in prompt.lower()


def test_vault_prompt_includes_vault_and_role():
    state = _make_state(
        vault_id="vlt_01", chamber="review", module="contracts", archetype="guardian"
    )
    prompt = build_vault_prompt(state)
    assert "vlt_01" in prompt
    assert "review" in prompt.lower()
    assert "guardian" in prompt.lower()


def test_general_prompt_is_conversational():
    state = _make_state(surface="messenger")
    prompt = build_general_prompt(state)
    assert "messenger" in prompt.lower() or "general" in prompt.lower()


def test_conductor_prompt_mentions_recipes():
    state = _make_state(org_role="conductor", module="admin")
    prompt = build_conductor_prompt(state)
    assert "recipe" in prompt.lower()
