"""Deterministic handlers — zero-LLM-cost responses for known intents."""

from __future__ import annotations

import logging

from src.otto.deps import OttoState
from src.otto.deterministic import DeterministicResult

logger = logging.getLogger(__name__)


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
    pass_count = ctx.get("pass_count", 0)
    fail_count = ctx.get("fail_count", 0)
    review_count = ctx.get("review_count", 0)
    total = pass_count + fail_count + review_count

    text = f"**Fields:** {pass_count}/{total} passing, {fail_count} failures, {review_count} need review"
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
    """Check gate conditions and report whether advancement is permitted.

    Does NOT mutate state — the caller (graph orchestrator) is responsible
    for committing the node index change when ``result.advanced is True``.
    """
    node = state.current_node or {}
    conditions = node.get("gate_conditions", [])
    current_index = state.current_node_index or 0
    total = state.total_recipe_nodes

    # Guard: recipe data not loaded yet
    if total is None:
        return DeterministicResult(
            intent="node_advance",
            text="**Cannot advance** — recipe data not loaded yet.",
            advanced=False,
            metadata={"blocked_reason": "recipe_not_loaded"},
        )

    # Bounds check: already at or past the last node
    if current_index >= total - 1:
        return DeterministicResult(
            intent="node_advance",
            text="**Recipe complete.** All steps finished.",
            advanced=False,
            metadata={"recipe_complete": True},
        )

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
            # Unknown condition type — fail-closed for safety
            logger.warning("Unknown gate condition type '%s' — blocking as fail-safe", ctype)
            passed = False

        results.append({"condition": condition, "passed": passed})
        if not passed:
            all_passed = False

    if all_passed:
        next_step = current_index + 2  # human-readable (1-based)
        text = f"Step complete! Moving to step {next_step}."
        return DeterministicResult(
            intent="node_advance",
            text=text,
            advanced=True,
            metadata={"results": results, "next_node_index": current_index + 1},
        )

    failing = [r for r in results if not r["passed"]]
    descriptions = [str(r["condition"]) for r in failing]
    text = "**Not ready yet.** Remaining conditions:\n" + "\n".join(f"- {d}" for d in descriptions)
    return DeterministicResult(
        intent="node_advance",
        text=text,
        advanced=False,
        metadata={"results": results},
    )
