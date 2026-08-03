"""Firefly Sync — Kuramoto-inspired colony confidence synchronization.

Queries 2-3 cheap models in parallel. Computes embedding similarity
across responses (phase coherence). Picks winner or escalates.

Biological basis: Firefly synchronization (Kuramoto coupled oscillators).
No central coordinator. Agreement = signal. Disagreement = escalate.

Usage:
    from inference.firefly_sync import FireflySync

    sync = FireflySync(api_key="sk-...")
    result = await sync.synchronize(
        query="How should I handle this situation?",
        models=["deepseek-v3", "grok-3-mini", "mixtral-8x22b"],
    )
    print(result.winner.response_text)
    print(result.coherence_score)
    print(result.phase_state)  # "locked", "partial", or "dark_forest"
"""

from __future__ import annotations

import asyncio
import math
import os
import re
from dataclasses import dataclass, field

import httpx

from inference.dharma_router import MODEL_IDS, MODEL_COSTS


@dataclass
class FireflyResponse:
    """One firefly's output — a model response with phase signal."""
    model: str
    model_id: str
    response_text: str
    confidence: float
    embedding: list[float] = field(default_factory=list)


@dataclass
class PhaseResult:
    """Colony synchronization result."""
    coherence_score: float
    winner: FireflyResponse | None
    escalated: bool
    total_cost: float
    phase_state: str  # "locked", "partial", "dark_forest"


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Cosine similarity between two vectors."""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def compute_coherence(
    responses: list[FireflyResponse],
    canary_models: set[str] | None = None,
    canary_weight: float = 1.0,
    canary_weights: dict[str, float] | None = None,
) -> float:
    """Weighted pairwise cosine similarity — the colony's phase coherence.

    Returns 1.0 for perfect sync, 0.0 for total disagreement.
    Single response = 1.0 (trivially coherent).

    Canary models get extra weight — their disagreement pulls coherence
    down harder. Like a skeptic on a panel: when they agree, it means
    something. When they disagree, it means MORE.

    canary_weights: Per-model weight overrides (e.g. {"haiku": 1.8, "llama-8b": 0.8}).
                   Falls back to canary_weight for models in canary_models but
                   not in canary_weights.
    """
    if len(responses) <= 1:
        return 1.0

    weighted_sims = []
    weights = []
    for i in range(len(responses)):
        for j in range(i + 1, len(responses)):
            sim = cosine_similarity(
                responses[i].embedding, responses[j].embedding
            )
            # Per-model canary weights — smart canary's disagreement hits harder
            w = 1.0
            if canary_weights:
                wi = canary_weights.get(responses[i].model, 1.0)
                wj = canary_weights.get(responses[j].model, 1.0)
                w = max(wi, wj)  # pair weight = strongest canary involved
            elif canary_models and (
                responses[i].model in canary_models
                or responses[j].model in canary_models
            ):
                w = canary_weight
            weighted_sims.append(sim * w)
            weights.append(w)

    return sum(weighted_sims) / sum(weights) if weights else 1.0


def select_winner(
    responses: list[FireflyResponse],
    coherence: float,
    locked_threshold: float = 0.85,
    partial_threshold: float = 0.6,
) -> PhaseResult:
    """Pick the colony winner based on phase coherence.

    Phase states:
        locked (>locked_threshold): highest confidence wins
        partial (>partial_threshold): closest to centroid wins
        dark_forest (<partial_threshold): escalate, no winner
    """
    total_cost = 0.0

    if coherence >= locked_threshold:
        winner = max(responses, key=lambda r: r.confidence)
        return PhaseResult(
            coherence_score=coherence,
            winner=winner,
            escalated=False,
            total_cost=total_cost,
            phase_state="locked",
        )

    if coherence >= partial_threshold:
        winner = _closest_to_centroid(responses)
        return PhaseResult(
            coherence_score=coherence,
            winner=winner,
            escalated=False,
            total_cost=total_cost,
            phase_state="partial",
        )

    return PhaseResult(
        coherence_score=coherence,
        winner=None,
        escalated=True,
        total_cost=total_cost,
        phase_state="dark_forest",
    )


def _closest_to_centroid(responses: list[FireflyResponse]) -> FireflyResponse:
    """Pick the response whose embedding is closest to the group centroid."""
    n = len(responses)
    dim = len(responses[0].embedding)
    centroid = [
        sum(r.embedding[d] for r in responses) / n for d in range(dim)
    ]
    best = None
    best_sim = -2.0
    for r in responses:
        sim = cosine_similarity(r.embedding, centroid)
        if sim > best_sim:
            best_sim = sim
            best = r
    return best


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

CONFIDENCE_SUFFIX = (
    "\n\nAfter your response, on a new line write exactly: "
    "'Confidence: X.XX' where X.XX is your confidence in this response (0.00-1.00)."
)


# ---------------------------------------------------------------------------
# FireflySync — async colony orchestrator
# ---------------------------------------------------------------------------

class FireflySync:
    """Colony confidence synchronization via Kuramoto phase coherence."""

    def __init__(
        self,
        api_key: str | None = None,
        embedding_model: str = "openai/text-embedding-3-small",
        locked_threshold: float = 0.85,
        partial_threshold: float = 0.6,
        canary_models: set[str] | None = None,
        canary_weight: float = 1.0,
        canary_weights: dict[str, float] | None = None,
    ):
        self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY", "")
        self.embedding_model = embedding_model
        self.locked_threshold = locked_threshold
        self.partial_threshold = partial_threshold
        self.canary_models = canary_models
        self.canary_weight = canary_weight
        self.canary_weights = canary_weights

    async def synchronize(
        self,
        query: str,
        models: list[tuple[str, str]],
        system_prompt: str = "",
        system_prompts: list[str] | None = None,
    ) -> PhaseResult:
        """Run the full firefly sync pipeline.

        Args:
            system_prompts: Per-model system prompts (len must match models).
                           Creates genuine intellectual diversity — models
                           with different lenses disagree on ambiguous tasks
                           while agreeing on clear ones.
        """
        responses = await self.call_models(query, models, system_prompt, system_prompts)
        await self.embed_responses(responses)
        coherence = compute_coherence(
            responses,
            canary_models=self.canary_models,
            canary_weight=self.canary_weight,
            canary_weights=self.canary_weights,
        )
        result = select_winner(
            responses,
            coherence,
            locked_threshold=self.locked_threshold,
            partial_threshold=self.partial_threshold,
        )
        result.total_cost = sum(
            MODEL_COSTS.get(r.model, 0.001) for r in responses
        )
        return result

    async def call_models(
        self,
        query: str,
        models: list[tuple[str, str]],
        system_prompt: str = "",
        system_prompts: list[str] | None = None,
    ) -> list[FireflyResponse]:
        """Fire all models in parallel, return FireflyResponses."""
        tasks = []
        for i, (name, model_id) in enumerate(models):
            prompt = system_prompts[i] if system_prompts and i < len(system_prompts) else system_prompt
            tasks.append(self._call_single_model(name, model_id, query, prompt))
        return await asyncio.gather(*tasks)

    async def _call_single_model(
        self,
        model_name: str,
        model_id: str,
        query: str,
        system_prompt: str = "",
    ) -> FireflyResponse:
        """Call a single model via OpenRouter."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": query + CONFIDENCE_SUFFIX})

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{OPENROUTER_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": model_id, "messages": messages},
            )
            resp.raise_for_status()
            data = resp.json()

        text = data["choices"][0]["message"]["content"]
        confidence, clean_text = self.parse_confidence(text)

        return FireflyResponse(
            model=model_name,
            model_id=model_id,
            response_text=clean_text,
            confidence=confidence,
            embedding=[],
        )

    async def embed_responses(self, responses: list[FireflyResponse]) -> None:
        """Embed all response texts via OpenRouter embedding endpoint."""
        texts = [r.response_text for r in responses]
        embeddings = await self._get_embeddings(texts)
        for r, emb in zip(responses, embeddings):
            r.embedding = emb

    async def _get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Get embeddings from OpenRouter."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{OPENROUTER_BASE}/embeddings",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.embedding_model, "input": texts},
            )
            resp.raise_for_status()
            data = resp.json()

        return [item["embedding"] for item in data["data"]]

    @staticmethod
    def parse_confidence(text: str) -> tuple[float, str]:
        """Extract confidence score from model response."""
        pattern = r"\n*Confidence:\s*([\d.]+)\s*$"
        match = re.search(pattern, text)
        if match:
            confidence = float(match.group(1))
            confidence = max(0.0, min(1.0, confidence))
            clean_text = text[: match.start()].rstrip()
            return confidence, clean_text
        return 0.5, text


if __name__ == "__main__":
    from inference.dharma_router import DharmaRouter

    router = DharmaRouter()

    intents = [
        "casual_chat",
        "deep_conversation",
        "crisis_moment",
        "canonical_otto",
        "team_dynamics",
    ]

    print("=== Firefly Sync — Colony Demo ===\n")

    for intent in intents:
        colony = router.route_colony(intent)
        model_names = [m[0] for m in colony.models]
        print(f"  {intent:25s} -> {model_names}")
        print(f"    threshold={colony.coherence_threshold}  "
              f"escalation={colony.escalation_model}  "
              f"cost=${colony.cost_estimate:.4f}")
        print()

    print("=== Cost Comparison ===\n")

    single_cost = router.estimate_lifecycle_cost()
    colony_cost = sum(
        router.route_colony(intent).cost_estimate * count
        for intent, count in {
            "casual_chat": 50,
            "deep_conversation": 10,
            "crisis_moment": 1,
            "canonical_otto": 5,
            "team_dynamics": 3,
        }.items()
    )

    print(f"  Single-model routed: ${single_cost['total_routed']:.4f}")
    print(f"  Colony (no escalation): ${colony_cost:.4f}")
    print(f"  Opus baseline: ${single_cost['total_opus_baseline']:.4f}")
    print(f"  Colony vs opus savings: {(1 - colony_cost / single_cost['total_opus_baseline']) * 100:.1f}%")
