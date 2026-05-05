"""ParasocialHealthService — 3-tier nudge engine for fan engagement health.

Evaluates fan engagement patterns and returns nudges to promote healthy
parasocial relationships. Tiers (priority highest first):

  TOUCH_GRASS   — engagement > 2σ above mean
  CHANNEL_IT    — deep topical concentration + high visit count
  CHECK_YOUR_ORBIT — follows very few creators with non-trivial visits
"""

from __future__ import annotations

import random
from enum import StrEnum


class NudgeTier(StrEnum):
    CHECK_YOUR_ORBIT = "CHECK_YOUR_ORBIT"
    CHANNEL_IT = "CHANNEL_IT"
    TOUCH_GRASS = "TOUCH_GRASS"


# ---------------------------------------------------------------------------
# Message pools — one is selected at random per evaluation
# ---------------------------------------------------------------------------

_MESSAGES: dict[NudgeTier, list[str]] = {
    NudgeTier.TOUCH_GRASS: [
        "Your Orbit's looking a little... geocentric. Time to expand?",
        "You've been here a lot lately. That's cool, but have you been outside?",
        "Even the most dedicated fans need a breather. Go touch some grass.",
    ],
    NudgeTier.CHANNEL_IT: [
        "You're deeply drawn to this content. Here's how to build that skill yourself.",
        "Love this creator's work? Channel that energy into your own projects.",
    ],
    NudgeTier.CHECK_YOUR_ORBIT: [
        "People with your profile also follow these creators...",
        "Your vibe matches some other interesting creators. Want to see?",
    ],
}

_SEVERITY: dict[NudgeTier, str] = {
    NudgeTier.TOUCH_GRASS: "gentle",
}


class ParasocialHealthService:
    """Stateless nudge evaluator — no DB required."""

    @staticmethod
    def evaluate(
        fan_visit_count: int,
        mean_visits: float,
        std_visits: float,
        creators_followed: int = 5,
        top_topic_pct: float = 0.0,
    ) -> dict | None:
        """Evaluate engagement patterns and return the highest-priority nudge.

        Parameters
        ----------
        fan_visit_count:
            Number of times this fan has visited the creator's Orbit.
        mean_visits:
            Population mean visit count (across all fans or relevant cohort).
        std_visits:
            Population standard deviation of visit counts.
        creators_followed:
            Total number of creators this fan follows on the platform.
        top_topic_pct:
            Fraction of engagement directed at the fan's single most-viewed topic
            (0.0 – 1.0).

        Returns
        -------
        dict with keys ``tier``, ``message``, plus tier-specific fields, or
        ``None`` if no nudge is warranted.
        """
        # Priority 1 — TOUCH_GRASS: engagement > 2σ above mean
        if std_visits > 0 and fan_visit_count > mean_visits + 2 * std_visits:
            return ParasocialHealthService._build(NudgeTier.TOUCH_GRASS)

        # Priority 2 — CHANNEL_IT: deep topical concentration + high visits
        if top_topic_pct > 0.75 and fan_visit_count > 20:
            return ParasocialHealthService._build(NudgeTier.CHANNEL_IT)

        # Priority 3 — CHECK_YOUR_ORBIT: follows very few creators
        if creators_followed <= 2 and fan_visit_count > 10:
            return ParasocialHealthService._build(NudgeTier.CHECK_YOUR_ORBIT)

        return None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build(tier: NudgeTier) -> dict:
        result: dict = {
            "tier": tier,
            "message": random.choice(_MESSAGES[tier]),
        }
        if tier in _SEVERITY:
            result["severity"] = _SEVERITY[tier]
        return result
