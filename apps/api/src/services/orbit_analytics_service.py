"""Confidence-gated analytics service for Orbit creator pages.

Progressively reveals analytics based on interaction count:
- NONE  (<5):   basic page views only
- LOW   (5-19): adds persona distribution pie chart
- MEDIUM (20-99): adds behavioral drive heatmap, engagement patterns
- HIGH  (100+): adds full audience intelligence
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any


class ConfidenceGate(StrEnum):
    """Analytics confidence gate levels."""

    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# Gate thresholds aligned with airlock-persona/inference/confidence-rules.yaml
_THRESHOLDS = {
    ConfidenceGate.NONE: 0,
    ConfidenceGate.LOW: 5,
    ConfidenceGate.MEDIUM: 20,
    ConfidenceGate.HIGH: 100,
}


def get_gate(interaction_count: int) -> ConfidenceGate:
    """Determine the confidence gate based on interaction count.

    Args:
        interaction_count: Total number of fan interactions on the Orbit page.

    Returns:
        ConfidenceGate enum value.
    """
    if interaction_count >= _THRESHOLDS[ConfidenceGate.HIGH]:
        return ConfidenceGate.HIGH
    if interaction_count >= _THRESHOLDS[ConfidenceGate.MEDIUM]:
        return ConfidenceGate.MEDIUM
    if interaction_count >= _THRESHOLDS[ConfidenceGate.LOW]:
        return ConfidenceGate.LOW
    return ConfidenceGate.NONE


def build_analytics(
    interaction_count: int,
    page_views: int = 0,
    persona_distribution: dict[str, Any] | None = None,
    drive_heatmap: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a filtered analytics dict based on the confidence gate.

    Only includes data that the current gate level permits.

    Args:
        interaction_count: Total fan interactions (determines gate).
        page_views: Total page views.
        persona_distribution: Persona breakdown data (unlocked at LOW).
        drive_heatmap: Behavioral drive heatmap data (unlocked at MEDIUM).

    Returns:
        Dict with gate level and permitted analytics fields.
    """
    gate = get_gate(interaction_count)

    result: dict[str, Any] = {
        "gate": gate.value,
        "interaction_count": interaction_count,
        "page_views": page_views,
    }

    if gate in (ConfidenceGate.LOW, ConfidenceGate.MEDIUM, ConfidenceGate.HIGH):
        result["persona_distribution"] = persona_distribution or {}

    if gate in (ConfidenceGate.MEDIUM, ConfidenceGate.HIGH):
        result["drive_heatmap"] = drive_heatmap or {}

    if gate == ConfidenceGate.HIGH:
        result["full_intelligence"] = True

    return result
