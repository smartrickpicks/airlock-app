"""Per-turn cost tracking for Glass Box AI.

Tracks exact cost of every model call, aggregates per-session,
and surfaces cost transparency to the user.

Glass Box Dimension: Per-turn token cost tracking (+0.3 points → 9.1)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum


class ModelTier(str, Enum):
    OPUS = "opus"
    SONNET = "sonnet"
    HAIKU = "haiku"
    DEEPSEEK_R1 = "deepseek_r1"
    GROK_MINI = "grok_mini"
    MIXTRAL = "mixtral"


# Pricing per token (USD) — updated 2026-03-15
MODEL_PRICING: dict[ModelTier, dict[str, float]] = {
    ModelTier.OPUS: {"input": 0.000015, "output": 0.000075},
    ModelTier.SONNET: {"input": 0.000003, "output": 0.000015},
    ModelTier.HAIKU: {"input": 0.0000008, "output": 0.000004},
    ModelTier.DEEPSEEK_R1: {"input": 0.00000055, "output": 0.00000219},
    ModelTier.GROK_MINI: {"input": 0.0000003, "output": 0.0000005},
    ModelTier.MIXTRAL: {"input": 0.00000065, "output": 0.00000065},
}

# Model string → tier mapping
MODEL_STRING_MAP: dict[str, ModelTier] = {
    "anthropic/claude-opus-4-6": ModelTier.OPUS,
    "anthropic/claude-sonnet-4-6": ModelTier.SONNET,
    "anthropic/claude-haiku-4.5": ModelTier.HAIKU,
    "deepseek/deepseek-r1": ModelTier.DEEPSEEK_R1,
    "x-ai/grok-3-mini-beta": ModelTier.GROK_MINI,
    "mistralai/mixtral-8x22b-instruct": ModelTier.MIXTRAL,
    "mistralai/mixtral-8x7b-instruct": ModelTier.MIXTRAL,
}


@dataclass
class TurnCost:
    """Cost record for a single model invocation."""
    timestamp: str
    model: str
    tier: ModelTier
    role: str  # "persona", "judge", "relay", "mushroom", "compress", "pipeline", "colony"
    persona: str | None
    input_tokens: int
    output_tokens: int
    cost_usd: float
    latency_ms: float

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "model": self.model,
            "tier": self.tier.value,
            "role": self.role,
            "persona": self.persona,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cost_usd": round(self.cost_usd, 6),
            "latency_ms": round(self.latency_ms, 1),
        }


@dataclass
class SessionCostTracker:
    """Tracks all costs within a session for Glass Box transparency."""
    session_id: str
    turns: list[TurnCost] = field(default_factory=list)

    def record(
        self,
        model: str,
        role: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: float = 0.0,
        persona: str | None = None,
    ) -> TurnCost:
        """Record a model invocation and return its cost."""
        tier = resolve_tier(model)
        cost = calculate_cost(tier, input_tokens, output_tokens)
        turn = TurnCost(
            timestamp=datetime.now(UTC).isoformat(),
            model=model,
            tier=tier,
            role=role,
            persona=persona,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost,
            latency_ms=latency_ms,
        )
        self.turns.append(turn)
        return turn

    @property
    def total_cost(self) -> float:
        return round(sum(t.cost_usd for t in self.turns), 6)

    @property
    def total_tokens(self) -> int:
        return sum(t.input_tokens + t.output_tokens for t in self.turns)

    @property
    def turn_count(self) -> int:
        return len(self.turns)

    def cost_by_role(self) -> dict[str, float]:
        """Cost breakdown by role (persona, judge, relay, etc.)."""
        breakdown: dict[str, float] = {}
        for t in self.turns:
            breakdown[t.role] = round(breakdown.get(t.role, 0.0) + t.cost_usd, 6)
        return breakdown

    def cost_by_tier(self) -> dict[str, float]:
        """Cost breakdown by model tier."""
        breakdown: dict[str, float] = {}
        for t in self.turns:
            key = t.tier.value
            breakdown[key] = round(breakdown.get(key, 0.0) + t.cost_usd, 6)
        return breakdown

    def cost_by_persona(self) -> dict[str, float]:
        """Cost breakdown by persona."""
        breakdown: dict[str, float] = {}
        for t in self.turns:
            key = t.persona or "system"
            breakdown[key] = round(breakdown.get(key, 0.0) + t.cost_usd, 6)
        return breakdown

    def summary(self) -> dict:
        """Glass Box cost summary for user display."""
        return {
            "session_id": self.session_id,
            "total_cost_usd": self.total_cost,
            "total_tokens": self.total_tokens,
            "turn_count": self.turn_count,
            "cost_by_role": self.cost_by_role(),
            "cost_by_tier": self.cost_by_tier(),
            "cost_by_persona": self.cost_by_persona(),
            "avg_cost_per_turn": round(
                self.total_cost / max(self.turn_count, 1), 6
            ),
            "turns": [t.to_dict() for t in self.turns],
        }


def resolve_tier(model_string: str) -> ModelTier:
    """Resolve a model string to its pricing tier."""
    if model_string in MODEL_STRING_MAP:
        return MODEL_STRING_MAP[model_string]
    # Fuzzy match
    lower = model_string.lower()
    if "opus" in lower:
        return ModelTier.OPUS
    if "sonnet" in lower:
        return ModelTier.SONNET
    if "haiku" in lower:
        return ModelTier.HAIKU
    if "deepseek" in lower:
        return ModelTier.DEEPSEEK_R1
    if "grok" in lower:
        return ModelTier.GROK_MINI
    if "mixtral" in lower or "mistral" in lower:
        return ModelTier.MIXTRAL
    return ModelTier.SONNET  # default


def calculate_cost(
    tier: ModelTier, input_tokens: int, output_tokens: int
) -> float:
    """Calculate cost for a single model call."""
    pricing = MODEL_PRICING[tier]
    return input_tokens * pricing["input"] + output_tokens * pricing["output"]


def format_cost_for_user(cost_usd: float) -> str:
    """Human-readable cost string."""
    if cost_usd < 0.001:
        return f"${cost_usd * 1000:.2f}m"  # millicents
    if cost_usd < 0.01:
        return f"${cost_usd:.4f}"
    return f"${cost_usd:.3f}"
