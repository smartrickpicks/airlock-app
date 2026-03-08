"""Deterministic intent resolver — Tier 0 execution with zero LLM cost."""

from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher


@dataclass
class DeterministicResult:
    """Result from deterministic resolution."""

    intent: str
    text: str
    metadata: dict | None = None
    advanced: bool = False


# Intent patterns: intent_name → list of trigger phrases
INTENT_PATTERNS: dict[str, list[str]] = {
    "gate_status": [
        "gate status",
        "gate color",
        "what gate",
        "health score",
        "what's the gate",
        "show gate",
        "gate check",
    ],
    "field_progress": [
        "how many fields",
        "field count",
        "fields complete",
        "fields done",
        "field progress",
        "field summary",
        "pass fail",
        "how many pass",
        "how many fail",
    ],
    "recipe_progress": [
        "where am i",
        "recipe progress",
        "how far",
        "what step",
        "current step",
        "remaining steps",
        "recipe status",
    ],
    "node_advance": [
        "done",
        "next step",
        "advance",
        "move on",
        "i'm done",
        "next node",
        "mark complete",
        "move to next",
    ],
}


def fuzzy_match_intent(
    message: str,
    patterns: dict[str, list[str]] | None = None,
) -> tuple[str | None, float]:
    """Match a user message to a deterministic intent using fuzzy matching.

    Returns (intent_name, confidence) or (None, 0.0) if no match.
    """
    if patterns is None:
        patterns = INTENT_PATTERNS

    lower = message.lower().strip()
    best_intent: str | None = None
    best_score: float = 0.0

    # Complex questions need LLM reasoning, not deterministic answers
    complexity_keywords = {"why", "how come", "explain", "what should", "recommend"}
    is_complex = any(kw in lower for kw in complexity_keywords)

    for intent, phrases in patterns.items():
        for phrase in phrases:
            # Check substring containment first (high confidence)
            if phrase in lower:
                # Penalize if the message is complex (needs reasoning)
                score = 0.70 if is_complex else 1.0
            else:
                # Fuzzy match
                score = SequenceMatcher(None, lower, phrase).ratio()

            if score > best_score:
                best_score = score
                best_intent = intent

    if best_score < 0.5:
        return None, 0.0

    return best_intent, best_score
