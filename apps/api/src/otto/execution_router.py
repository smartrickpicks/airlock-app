"""Execution router — routes messages through feature-flagged tiers."""

import logging
from dataclasses import dataclass

from src.otto.deps import OttoState
from src.otto.deterministic import fuzzy_match_intent
from src.otto.feature_gate import ExecutionTierConfig

logger = logging.getLogger(__name__)

# Deterministic intents that perform write operations
WRITE_INTENTS = {"node_advance"}


@dataclass
class RouteResult:
    """Result of execution routing."""

    tier: str  # "deterministic" | "local_llm" | "cloud_llm" | "error"
    intent: str | None = None
    message: str = ""
    error: str | None = None


class ExecutionRouter:
    """Routes messages through the cheapest capable tier."""

    def __init__(self, config: ExecutionTierConfig) -> None:
        self.config = config

    def route(self, message: str, state: OttoState) -> RouteResult:
        """Route a message through the fallback chain."""
        for tier_name in self.config.fallback_order:
            tier = self.config.tiers.get(tier_name)
            if not tier or not tier.enabled:
                continue

            if tier_name == "deterministic":
                result = self._try_deterministic(message, state, tier.confidence_threshold)
                if result:
                    return result

            elif tier_name == "local_llm":
                # Local LLM handles simple queries that aren't deterministic
                if self._is_simple_query(message, state):
                    return RouteResult(tier="local_llm", message=message)
                # Complex query -> fall through

            elif tier_name == "cloud_llm":
                return RouteResult(tier="cloud_llm", message=message)

        return RouteResult(
            tier="error",
            error="No execution tier available. Check Otto configuration.",
        )

    def _try_deterministic(
        self, message: str, state: OttoState, threshold: float
    ) -> RouteResult | None:
        """Try to resolve via deterministic intent matching."""
        intent, confidence = fuzzy_match_intent(message)

        if intent and confidence >= threshold:
            # Messenger can't execute write actions
            if state.surface == "messenger" and intent in WRITE_INTENTS:
                return None  # Fall through to LLM tier
            return RouteResult(tier="deterministic", intent=intent, message=message)

        return None

    def _is_simple_query(self, message: str, state: OttoState) -> bool:
        """Heuristic: is this query simple enough for local LLM?"""
        # Short messages without complex reasoning keywords
        words = message.split()
        if len(words) > 30:
            return False
        complex_keywords = {"why", "compare", "analyze", "suggest", "recommend", "because"}
        return not (complex_keywords & {w.lower().rstrip("?.,!") for w in words})
