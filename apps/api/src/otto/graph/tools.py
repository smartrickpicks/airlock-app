"""Tool authorization matrix — which tools each sub-agent can access."""

# Role hierarchy for min_role checks
ROLE_HIERARCHY = {
    "member": 0,
    "builder": 1,
    "gatekeeper": 2,
    "conductor": 3,
    "owner": 4,
}

# Tool definitions with authorization rules
TOOL_AUTH: dict[str, dict] = {
    # Existing read tools — available to all
    "get_gate_status": {"min_role": "member", "agents": ["recipe", "vault"]},
    "get_field_summary": {"min_role": "member", "agents": ["recipe", "vault"]},
    "get_contract_health": {"min_role": "member", "agents": ["vault", "general"]},
    "get_deal_fields": {"min_role": "member", "agents": ["vault", "general"]},
    "get_extraction_meta": {"min_role": "member", "agents": ["recipe", "vault"]},
    "get_corpus_context": {"min_role": "member", "agents": ["vault"]},
    "get_open_patches": {"min_role": "member", "agents": ["vault"]},
    "get_preflight_status": {"min_role": "member", "agents": ["vault"]},
    "get_timeline": {"min_role": "member", "agents": ["vault"]},
    "search_vaults": {"min_role": "member", "agents": ["general", "conductor"]},
    # Write-adjacent
    "suggest_patch": {"min_role": "builder", "agents": ["recipe", "vault"]},
    "run_preflight": {"min_role": "builder", "agents": ["vault"]},
    # Recipe tools (new)
    "get_recipe_progress": {"min_role": "member", "agents": ["recipe"]},
    "advance_node": {"min_role": "member", "agents": ["recipe"]},
    # Conductor tools (new)
    "list_recipes": {"min_role": "conductor", "agents": ["conductor"]},
    "get_recipe_detail": {"min_role": "conductor", "agents": ["conductor"]},
    "get_team_summary": {"min_role": "conductor", "agents": ["conductor"]},
    # Phase 2
    "edit_recipe_node": {"min_role": "conductor", "agents": ["conductor"]},
}


def get_tools_for_agent(agent_type: str, org_role: str = "member") -> list[dict]:
    """Return authorized tools for a given agent type and user role."""
    user_level = ROLE_HIERARCHY.get(org_role, 0)
    tools = []

    for tool_name, auth in TOOL_AUTH.items():
        if agent_type not in auth["agents"]:
            continue
        min_level = ROLE_HIERARCHY.get(auth["min_role"], 0)
        if user_level < min_level:
            continue
        tools.append({"name": tool_name, "auth": auth})

    return tools
