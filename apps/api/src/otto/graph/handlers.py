"""Deterministic handlers — zero-LLM-cost responses for known intents."""

from __future__ import annotations

from src.otto.deps import OttoState
from src.otto.deterministic import DeterministicResult


def handle_gate_status(state: OttoState) -> DeterministicResult:
    """Format gate status from vault context. No LLM needed."""
    ctx = state.vault_context or {}
    gate_color = ctx.get("gate_color", "unknown")
    health = ctx.get("health_score", 0)
    health_pct = f"{health:.0%}" if isinstance(health, float) else str(health)

    text = f"**Gate Status:** {gate_color.upper()} — Health: {health_pct}"
    return DeterministicResult(intent="gate_status", text=text, metadata=ctx)


def handle_field_summary(state: OttoState) -> DeterministicResult:
    """Format field pass/fail/review counts. No LLM needed."""
    ctx = state.vault_context or {}
    p = ctx.get("pass_count", 0)
    f = ctx.get("fail_count", 0)
    r = ctx.get("review_count", 0)
    total = p + f + r

    text = f"**Fields:** {p}/{total} passing, {f} failures, {r} need review"
    return DeterministicResult(intent="field_progress", text=text, metadata=ctx)


def handle_recipe_progress(state: OttoState) -> DeterministicResult:
    """Format recipe progress. No LLM needed."""
    index = (state.current_node_index or 0) + 1
    total = state.total_recipe_nodes or "?"
    node = state.current_node or {}
    node_type = node.get("type", "unknown")
    desc = node.get("config", {}).get("description", node_type)

    pct = f"{index / total * 100:.0f}%" if isinstance(total, int) and total > 0 else "—"
    text = (
        f"**Recipe Progress:** Step {index} of {total} ({pct})\n**Current:** {node_type} — {desc}"
    )
    return DeterministicResult(intent="recipe_progress", text=text)


def handle_node_advance(state: OttoState) -> DeterministicResult:
    """Check gate conditions and advance recipe node. Pure logic, no LLM."""
    node = state.current_node or {}
    conditions = node.get("gate_conditions", [])

    results = []
    all_passed = True

    for condition in conditions:
        ctype = condition.get("type", "")
        passed = False

        if ctype == "field_value":
            actual = condition.get("actual")
            expected = condition.get("expected")
            passed = actual is not None and actual == expected
        elif ctype == "step_completion":
            passed = condition.get("completed", False)
        elif ctype == "signal_count":
            count = condition.get("count", 0)
            threshold = condition.get("threshold", 1)
            passed = count >= threshold
        else:
            # Unknown condition type — pass by default (lenient)
            passed = True

        results.append({"condition": condition, "passed": passed})
        if not passed:
            all_passed = False

    if all_passed:
        state.current_node_index = (state.current_node_index or 0) + 1
        text = f"Step complete! Moving to step {state.current_node_index + 1}."
        return DeterministicResult(
            intent="node_advance",
            text=text,
            advanced=True,
            metadata={"results": results},
        )
    else:
        failing = [r for r in results if not r["passed"]]
        descriptions = [str(r["condition"]) for r in failing]
        text = "**Not ready yet.** Remaining conditions:\n" + "\n".join(
            f"- {d}" for d in descriptions
        )
        return DeterministicResult(
            intent="node_advance",
            text=text,
            advanced=False,
            metadata={"results": results},
        )
