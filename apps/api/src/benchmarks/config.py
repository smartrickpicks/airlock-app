"""ConstellationBench configuration — model tiers and scoring weights."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelTier:
    """A model configuration to benchmark against."""

    name: str  # Human label, e.g. "opus-4.6"
    model_id: str  # OpenRouter model ID, e.g. "anthropic/claude-opus-4-20250514"
    provider: str  # "openrouter" | "anthropic" | "ollama"
    base_url: str  # API endpoint
    max_tokens: int = 4096
    cost_per_1k_input: float = 0.0  # USD, filled from OpenRouter pricing
    cost_per_1k_output: float = 0.0


# ── Model Tier Registry ─────────────────────────────────────────
# Add/remove tiers here. The harness iterates all of them.
MODEL_TIERS: list[ModelTier] = [
    ModelTier(
        name="opus-4.6",
        model_id="anthropic/claude-opus-4-20250514",
        provider="openrouter",
        base_url="https://openrouter.ai/api/v1",
        cost_per_1k_input=15.0,
        cost_per_1k_output=75.0,
    ),
    ModelTier(
        name="sonnet-4.6",
        model_id="anthropic/claude-sonnet-4-20250514",
        provider="openrouter",
        base_url="https://openrouter.ai/api/v1",
        cost_per_1k_input=3.0,
        cost_per_1k_output=15.0,
    ),
    ModelTier(
        name="haiku-4.5",
        model_id="anthropic/claude-haiku-4-20250414",
        provider="openrouter",
        base_url="https://openrouter.ai/api/v1",
        cost_per_1k_input=0.80,
        cost_per_1k_output=4.0,
    ),
    ModelTier(
        name="gpt-4o",
        model_id="openai/gpt-4o",
        provider="openrouter",
        base_url="https://openrouter.ai/api/v1",
        cost_per_1k_input=2.5,
        cost_per_1k_output=10.0,
    ),
    ModelTier(
        name="gemini-2.5-pro",
        model_id="google/gemini-2.5-pro-preview",
        provider="openrouter",
        base_url="https://openrouter.ai/api/v1",
        cost_per_1k_input=1.25,
        cost_per_1k_output=10.0,
    ),
    # Uncomment when Ollama is running locally:
    # ModelTier(
    #     name="llama-3.3-local",
    #     model_id="llama3.3",
    #     provider="ollama",
    #     base_url="http://localhost:11434/v1",
    #     cost_per_1k_input=0.0,
    #     cost_per_1k_output=0.0,
    # ),
]


# ── Council Configurations ──────────────────────────────────────
COUNCILS: dict[str, dict] = {
    "discover": {
        "members": ["scholar", "strategist", "venturer", "individualist"],
        "lead": "scholar",
        "chamber": "Discover",
    },
    "build": {
        "members": ["maverick", "venturer", "artisan", "persuader"],
        "lead": "maverick",
        "chamber": "Build",
    },
    "ship": {
        "members": ["guardian", "operator", "controller", "analyzer"],
        "lead": "guardian",
        "chamber": "Ship",
    },
    "audit": {
        "members": ["guardian", "analyzer", "controller", "operator"],
        "lead": "guardian",
        "chamber": "Review",
    },
}


# ── Scoring Weights ─────────────────────────────────────────────
@dataclass(frozen=True)
class ScoringWeights:
    persona_adherence: float = 0.30  # Does response match DECF profile?
    deliberation_diversity: float = 0.25  # Do personas diverge meaningfully?
    response_quality: float = 0.25  # Specificity, actionability, coherence
    json_compliance: float = 0.20  # Did it return valid JSON per schema?


WEIGHTS = ScoringWeights()
