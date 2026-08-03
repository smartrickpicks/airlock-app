"""Dharma Router — Benchmark-driven model selection for persona layers.

Routes each behavioral dimension to the model that won that dimension
in the Dharma Circuit benchmark. Cuts persona costs by 98% vs opus-everything
while improving quality by ~29%.

Usage:
    from inference.dharma_router import DharmaRouter

    router = DharmaRouter()
    model = router.route("casual_chat")           # → deepseek-v3
    model = router.route("deep_conversation")      # → grok-3-mini
    model = router.route("crisis_moment")          # → sonnet (escalates to opus)

    # With escalation context
    model = router.route("deep_conversation", context={
        "ubuntu_detected": True,
        "persona_count": 1,
    })  # → sonnet (ubuntu escalation triggered)
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

ROUTER_CONFIG = Path(__file__).parent / "dharma-router.yaml"

# OpenRouter model IDs
MODEL_IDS: dict[str, str] = {
    "deepseek-v3": "deepseek/deepseek-chat",
    "grok-3-mini": "x-ai/grok-3-mini",
    "mixtral-8x22b": "mistralai/mixtral-8x22b-instruct",
    "mixtral-8x7b": "mistralai/mixtral-8x7b-instruct",
    "sonnet": "anthropic/claude-sonnet-4-6",
    "opus": "anthropic/claude-opus-4-6",
    "haiku": "anthropic/claude-haiku-4-5-20251001",
    "qwen3-235b": "qwen/qwen3-235b",
    "kimi-k2.5": "moonshotai/kimi-k2.5",
    # Image generation models (cognitive modality routing)
    "gemini-2.5-flash-image": "google/gemini-2.5-flash-image",
    "gemini-3.1-flash-image": "google/gemini-3.1-flash-image-preview",
    "gemini-3-pro-image": "google/gemini-3-pro-image-preview",
    "gpt-5-image-mini": "openai/gpt-5-image-mini",
    "gpt-5-image": "openai/gpt-5-image",
    "gpt-image-1": "gpt-image-1",  # OpenAI direct API (not OpenRouter)
}

# Cost per 1K tokens (input/output avg) — image models use per-image cost
MODEL_COSTS: dict[str, float] = {
    "deepseek-v3": 0.0003,
    "grok-3-mini": 0.0005,
    "mixtral-8x22b": 0.0004,
    "mixtral-8x7b": 0.0002,
    "sonnet": 0.006,
    "opus": 0.045,
    "haiku": 0.002,
    "qwen3-235b": 0.0002,
    "kimi-k2.5": 0.001,
    # Image models (cost per image, not per 1K tokens)
    "gemini-2.5-flash-image": 0.003,
    "gemini-3.1-flash-image": 0.005,
    "gemini-3-pro-image": 0.020,
    "gpt-5-image-mini": 0.010,
    "gpt-5-image": 0.040,
    "gpt-image-1": 0.040,
}


@dataclass
class RouteDecision:
    model: str
    model_id: str
    cost_per_call: float
    reason: str
    escalated: bool = False
    escalated_from: str | None = None


@dataclass
class ColonyDecision:
    """Colony routing decision — multiple models for firefly sync."""
    models: list[tuple[str, str]]  # [(model_name, model_id), ...]
    coherence_threshold: float
    escalation_model: str
    escalation_model_id: str
    cost_estimate: float
    reason: str


class DharmaRouter:
    """Routes persona requests to the cheapest model that wins each behavioral layer."""

    def __init__(self, config_path: Path | None = None):
        path = config_path or ROUTER_CONFIG
        with open(path) as f:
            self._config = yaml.safe_load(f)

        self._composites = self._config.get("composite_routes", {})
        self._layers = self._config.get("layers", {})
        self._blacklist = set(self._config.get("blacklist", {}).keys())
        self._colony_routes = self._config.get("colony_routes", {})

    def route(
        self,
        intent: str,
        context: dict | None = None,
        budget_mode: bool = False,
    ) -> RouteDecision:
        """Pick the best model for a given conversational intent.

        Args:
            intent: One of the composite route names (casual_chat, deep_conversation, etc.)
                    or a raw layer name (L1_persona_fidelity, etc.)
            context: Optional dict with signals for escalation triggers.
            budget_mode: If True, always route to deepseek-v3 (cheapest viable).

        Returns:
            RouteDecision with model name, OpenRouter ID, cost, and reasoning.
        """
        ctx = context or {}

        if budget_mode:
            return RouteDecision(
                model="deepseek-v3",
                model_id=MODEL_IDS["deepseek-v3"],
                cost_per_call=MODEL_COSTS["deepseek-v3"],
                reason="Budget mode — deepseek-v3 beats opus on Dharma at 99.2% less cost",
            )

        # Try composite route first
        if intent in self._composites:
            return self._route_composite(intent, ctx)

        # Try raw layer
        if intent in self._layers:
            return self._route_layer(intent)

        # Default: casual chat
        return self._route_composite("casual_chat", ctx)

    def _route_composite(self, intent: str, ctx: dict) -> RouteDecision:
        comp = self._composites[intent]
        primary = comp["primary"]
        cost = comp.get("cost_estimate", MODEL_COSTS.get(primary, 0.001))

        # Check escalation triggers
        escalate_to = comp.get("escalate_to")
        trigger = comp.get("escalate_trigger", "")

        if escalate_to and self._should_escalate(trigger, ctx):
            return RouteDecision(
                model=escalate_to,
                model_id=MODEL_IDS.get(escalate_to, escalate_to),
                cost_per_call=MODEL_COSTS.get(escalate_to, 0.01),
                reason=f"Escalated: {trigger}",
                escalated=True,
                escalated_from=primary,
            )

        return RouteDecision(
            model=primary,
            model_id=MODEL_IDS.get(primary, primary),
            cost_per_call=cost,
            reason=comp.get("vibe", f"Dharma-routed to {primary}"),
        )

    def _route_layer(self, layer: str) -> RouteDecision:
        cfg = self._layers[layer]
        winner = cfg["winner"]

        if winner == "any":
            winner = "deepseek-v3"

        return RouteDecision(
            model=winner,
            model_id=MODEL_IDS.get(winner, winner),
            cost_per_call=cfg.get("cost_per_call", MODEL_COSTS.get(winner, 0.001)),
            reason=cfg.get("why", f"Layer winner: {winner}"),
        )

    def _should_escalate(self, trigger: str, ctx: dict) -> bool:
        """Evaluate escalation trigger against context signals.

        Supports compound triggers joined by 'or' — any matching clause fires.
        """
        if not trigger:
            return False

        # Evaluate each condition — compound triggers (containing 'or') fire
        # if ANY sub-condition matches.
        matched = False

        if "ubuntu" in trigger or "relational" in trigger:
            if ctx.get("ubuntu_detected", False):
                return True
            matched = True

        if "confidence" in trigger:
            conf = ctx.get("confidence", 1.0)
            if conf < 0.7:
                return True
            matched = True

        if "distress" in trigger:
            if ctx.get("user_distress", False):
                return True
            matched = True

        if "3+ personas" in trigger:
            if ctx.get("persona_count", 1) >= 3:
                return True
            matched = True

        if "observation" in trigger or "expectation" in trigger:
            if ctx.get("relational_framing", False):
                return True
            matched = True

        if "high-stakes" in trigger:
            if ctx.get("high_stakes", False):
                return True
            matched = True

        # If we matched at least one clause but none fired, no escalation
        if matched:
            return False

        return False

    def estimate_lifecycle_cost(self, conversation_mix: dict[str, int] | None = None) -> dict:
        """Estimate total cost for a typical persona lifecycle.

        Args:
            conversation_mix: Dict mapping intent → number of calls.
                Defaults to a typical session distribution.

        Returns:
            Dict with per-intent and total cost breakdown.
        """
        if conversation_mix is None:
            conversation_mix = {
                "casual_chat": 50,
                "deep_conversation": 10,
                "first_impression": 2,
                "crisis_moment": 1,
                "team_dynamics": 3,
                "canonical_otto": 5,
            }

        breakdown = {}
        total = 0.0

        for intent, count in conversation_mix.items():
            decision = self.route(intent)
            cost = decision.cost_per_call * count
            breakdown[intent] = {
                "model": decision.model,
                "calls": count,
                "cost_per_call": decision.cost_per_call,
                "subtotal": round(cost, 6),
            }
            total += cost

        opus_cost = sum(MODEL_COSTS["opus"] * c for c in conversation_mix.values())

        return {
            "breakdown": breakdown,
            "total_routed": round(total, 6),
            "total_opus_baseline": round(opus_cost, 4),
            "savings_pct": round((1 - total / opus_cost) * 100, 1) if opus_cost > 0 else 0,
        }

    def route_colony(
        self,
        intent: str,
        context: dict | None = None,
    ) -> ColonyDecision:
        """Pick 2-3 models for firefly sync on this intent.

        If the intent has a colony_routes entry, return that config.
        Otherwise, fall back to single-model route wrapped in ColonyDecision.
        """
        if intent in self._colony_routes:
            cfg = self._colony_routes[intent]
            models = [
                (m, MODEL_IDS.get(m, m)) for m in cfg["models"]
            ]
            escalation = cfg.get("escalation_model", "opus")
            return ColonyDecision(
                models=models,
                coherence_threshold=cfg.get("coherence_threshold", 0.85),
                escalation_model=escalation,
                escalation_model_id=MODEL_IDS.get(escalation, escalation),
                cost_estimate=sum(MODEL_COSTS.get(m, 0.001) for m, _ in models),
                reason=f"Colony route: {intent} ({len(models)} fireflies)",
            )

        single = self.route(intent, context)
        return ColonyDecision(
            models=[(single.model, single.model_id)],
            coherence_threshold=0.85,
            escalation_model="opus",
            escalation_model_id=MODEL_IDS.get("opus", "opus"),
            cost_estimate=single.cost_per_call,
            reason=f"Single-model fallback: {single.model}",
        )

    @property
    def blacklisted(self) -> set[str]:
        return self._blacklist

    def is_blacklisted(self, model: str) -> bool:
        return model in self._blacklist


if __name__ == "__main__":
    router = DharmaRouter()

    print("=== Dharma Router — Route Decisions ===\n")

    intents = [
        "casual_chat",
        "deep_conversation",
        "first_impression",
        "crisis_moment",
        "team_dynamics",
        "canonical_otto",
    ]

    for intent in intents:
        d = router.route(intent)
        print(f"  {intent:25s} → {d.model:18s} (${d.cost_per_call:.4f})  {d.reason}")

    print("\n=== Escalation Examples ===\n")

    d = router.route("deep_conversation", context={"ubuntu_detected": True})
    print(f"  deep + ubuntu            → {d.model:18s} escalated={d.escalated}")

    d = router.route("crisis_moment", context={"confidence": 0.5, "user_distress": True})
    print(f"  crisis + low confidence  → {d.model:18s} escalated={d.escalated}")

    d = router.route("team_dynamics", context={"persona_count": 5})
    print(f"  team + 5 personas        → {d.model:18s} escalated={d.escalated}")

    print("\n=== Lifecycle Cost Estimate ===\n")

    estimate = router.estimate_lifecycle_cost()
    for intent, info in estimate["breakdown"].items():
        print(f"  {intent:25s} {info['calls']:3d} calls × ${info['cost_per_call']:.4f} = ${info['subtotal']:.6f}  ({info['model']})")

    print(f"\n  ROUTED TOTAL:  ${estimate['total_routed']:.4f}")
    print(f"  OPUS BASELINE: ${estimate['total_opus_baseline']:.4f}")
    print(f"  SAVINGS:       {estimate['savings_pct']}%")
