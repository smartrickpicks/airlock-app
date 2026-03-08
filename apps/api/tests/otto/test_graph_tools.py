"""Tests for Otto tool authorization matrix."""

from src.otto.graph.tools import get_tools_for_agent


def test_recipe_agent_tools():
    tools = get_tools_for_agent("recipe", org_role="member")
    names = {t["name"] for t in tools}
    assert "get_gate_status" in names
    assert "advance_node" in names
    assert "get_recipe_progress" in names
    # Conductor-only tools should NOT be present
    assert "list_recipes" not in names


def test_vault_agent_tools():
    tools = get_tools_for_agent("vault", org_role="member")
    names = {t["name"] for t in tools}
    assert "get_gate_status" in names
    assert "suggest_patch" not in names  # member can't suggest patches (min_role: builder)
    assert "advance_node" not in names


def test_vault_agent_tools_for_builder():
    tools = get_tools_for_agent("vault", org_role="builder")
    names = {t["name"] for t in tools}
    assert "suggest_patch" in names
    assert "run_preflight" in names


def test_general_agent_tools():
    tools = get_tools_for_agent("general", org_role="member")
    names = {t["name"] for t in tools}
    assert "search_vaults" in names
    assert "advance_node" not in names
    assert "suggest_patch" not in names


def test_conductor_agent_tools():
    tools = get_tools_for_agent("conductor", org_role="conductor")
    names = {t["name"] for t in tools}
    assert "list_recipes" in names
    assert "get_recipe_detail" in names


def test_conductor_tools_denied_for_member():
    tools = get_tools_for_agent("conductor", org_role="member")
    names = {t["name"] for t in tools}
    assert "list_recipes" not in names
