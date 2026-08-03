"""AEGIS Subtractive Learning Engine.

Processes feedback signals into channel engagement scores.
Design: Start at 0.5 for all channels. Positive feedback pushes toward 1.0.
Negative feedback pushes toward 0.0. Suppressed channels hard-lock to 0.0.
Recent signals matter more than old ones (exponential decay).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

CHANNELS = ["recon", "live_coach", "comms_relay", "ambient"]
DEFAULT_SCORE = 0.5
DECAY_HALF_LIFE_HOURS = 24
LEARNING_RATE = 0.1


@dataclass
class AttentionProfile:
    """User's accumulated AEGIS attention signals."""
    feedback_signals: list[dict] = field(default_factory=list)
    suppressed_channels: list[str] = field(default_factory=list)


def compute_channel_scores(profile: AttentionProfile) -> dict[str, float]:
    """Compute engagement scores for each AEGIS channel.

    Each channel starts at DEFAULT_SCORE (0.5). Feedback signals adjust
    the score up or down, with exponential time decay so recent signals
    carry more weight. Scores are clamped to [0.0, 1.0]. Suppressed
    channels are hard-locked to 0.0.
    """
    scores: dict[str, float] = {ch: DEFAULT_SCORE for ch in CHANNELS}

    for signal in profile.feedback_signals:
        channel = signal.get("channel")
        if channel not in scores:
            continue

        weight = signal.get("weight", 0.0)
        age_hours = signal.get("age_hours", 0)

        # Exponential decay: half-life of 24 hours
        decay = math.exp(-0.693 * age_hours / DECAY_HALF_LIFE_HOURS)
        effective_weight = weight * decay * LEARNING_RATE

        scores[channel] += effective_weight

    # Clamp all scores to [0.0, 1.0]
    for ch in CHANNELS:
        scores[ch] = max(0.0, min(1.0, scores[ch]))

    # Hard-lock suppressed channels to 0.0
    for ch in profile.suppressed_channels:
        if ch in scores:
            scores[ch] = 0.0

    return scores


def should_fire(channel: str, scores: dict[str, float], threshold: float = 0.2) -> bool:
    """Determine if a channel should fire based on its score and threshold."""
    return scores.get(channel, 0.0) >= threshold
