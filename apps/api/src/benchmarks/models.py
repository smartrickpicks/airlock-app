"""ConstellationBench data models for benchmark runs and results."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass
class Perspective:
    """A single council member's response."""

    persona: str
    position: str
    conviction: float
    concerns: list[str]
    opportunities: list[str]
    recommends_action: bool
    raw_response: str = ""  # The full LLM output (for debugging)
    json_valid: bool = True  # Did the response parse as valid JSON?
    latency_ms: int = 0
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class DECFProfile:
    """A persona's drive scores."""

    persona_id: str
    dominance: int
    extraversion: int
    patience: int
    formality: int


@dataclass
class BenchmarkScore:
    """Scores for a single (query, model_tier, persona) combination."""

    persona_adherence: float = 0.0  # 0-1: how well response matches DECF
    deliberation_diversity: float = 0.0  # 0-1: divergence from other perspectives
    response_quality: float = 0.0  # 0-1: specificity + actionability
    json_compliance: float = 0.0  # 0 or 1: valid JSON per schema
    weighted_total: float = 0.0  # Weighted composite


@dataclass
class CouncilRunResult:
    """Complete result for one (query, model_tier) combination."""

    query_id: str
    query_text: str
    command: str  # discover, build, ship, audit
    model_tier: str  # e.g. "sonnet-4.6"
    model_id: str  # e.g. "anthropic/claude-sonnet-4-20250514"
    council_config: dict = field(default_factory=dict)
    perspectives: list[Perspective] = field(default_factory=list)
    scores: dict[str, BenchmarkScore] = field(default_factory=dict)  # persona → score
    aggregate_score: float = 0.0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cost_usd: float = 0.0
    total_latency_ms: int = 0
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    errors: list[str] = field(default_factory=list)


@dataclass
class BenchmarkReport:
    """Full benchmark report across all model tiers for a query set."""

    run_id: str
    started_at: str
    completed_at: str = ""
    query_count: int = 0
    model_tiers: list[str] = field(default_factory=list)
    results: list[CouncilRunResult] = field(default_factory=list)
    summary: dict[str, Any] = field(default_factory=dict)  # tier → aggregate stats
