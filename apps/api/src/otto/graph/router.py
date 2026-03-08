"""OttoRouter — deterministic dispatch to sub-agent nodes."""

from src.otto.deps import OttoState


def resolve_agent_type(state: OttoState) -> str:
    """Determine which sub-agent should handle this message.

    Pure function — no LLM call, no I/O. Just pattern matching on state.
    Returns: "conductor" | "recipe" | "vault" | "general"
    """
    # Conductor/Owner on admin surface → ConductorAgent
    if (
        state.org_role in ("owner", "conductor")
        and state.surface == "task_runner"
        and state.module == "admin"
    ):
        return "conductor"

    # Task Runner with active recipe → RecipeAgent
    if state.surface == "task_runner" and state.active_recipe_id and state.current_node:
        return "recipe"

    # Any surface with vault context → VaultAgent
    if state.vault_id:
        return "vault"

    # Messenger or no vault → GeneralAgent
    return "general"
