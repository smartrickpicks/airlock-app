"""ConstellationBench scoring engine — measures persona adherence, diversity, and quality."""

from __future__ import annotations

import re
from collections.abc import Sequence

from src.benchmarks.config import WEIGHTS
from src.benchmarks.models import BenchmarkScore, DECFProfile, Perspective

HIGH_D_SIGNALS = {
    "must",
    "immediately",
    "ship",
    "now",
    "decisive",
    "bold",
    "act",
    "move",
    "push",
    "own",
    "lead",
    "drive",
}
HIGH_E_SIGNALS = {
    "team",
    "collaborate",
    "together",
    "discuss",
    "share",
    "align",
    "communicate",
    "rally",
    "engage",
}
HIGH_C_SIGNALS = {
    "careful",
    "thorough",
    "systematic",
    "methodical",
    "patience",
    "deliberate",
    "steady",
    "sustained",
    "long-term",
}
HIGH_F_SIGNALS = {
    "process",
    "standard",
    "compliance",
    "documentation",
    "procedure",
    "audit",
    "protocol",
    "guideline",
    "verify",
    "validate",
}

LOW_D_SIGNALS = {"perhaps", "maybe", "consider", "might", "could", "suggest", "if possible"}
LOW_C_SIGNALS = {
    "urgently",
    "quickly",
    "fast",
    "sprint",
    "rush",
    "asap",
    "immediately",
    "right now",
}
LOW_F_SIGNALS = {"skip", "bypass", "forget the process", "just do it", "move fast", "iterate"}


class Scorer:
    """Scores constellation council responses across multiple dimensions."""

    def score_json_compliance(self, perspective: Perspective) -> float:
        if not perspective.json_valid:
            return 0.0
        if not perspective.position or not perspective.concerns or not perspective.opportunities:
            return 0.5
        return 1.0

    def score_persona_adherence(
        self,
        perspective: Perspective,
        profile: DECFProfile,
    ) -> float:
        text = (
            perspective.position
            + " "
            + " ".join(perspective.concerns)
            + " "
            + " ".join(perspective.opportunities)
        ).lower()
        words = set(re.findall(r"\b\w+\b", text))

        score = 0.0
        checks = 0

        checks += 1
        d = profile.dominance
        if d >= 7:
            hit_rate = len(words & HIGH_D_SIGNALS) / max(len(HIGH_D_SIGNALS), 1)
            conviction_bonus = 0.3 if perspective.conviction >= 7.0 else 0.0
            action_bonus = 0.2 if perspective.recommends_action else 0.0
            score += min(hit_rate + conviction_bonus + action_bonus, 1.0)
        elif d <= 3:
            hit_rate = len(words & LOW_D_SIGNALS) / max(len(LOW_D_SIGNALS), 1)
            caution_bonus = 0.3 if perspective.conviction <= 6.0 else 0.0
            score += min(hit_rate + caution_bonus, 1.0)
        else:
            score += 0.5

        checks += 1
        e = profile.extraversion
        if e >= 7:
            hit_rate = len(words & HIGH_E_SIGNALS) / max(len(HIGH_E_SIGNALS), 1)
            score += min(hit_rate + 0.2, 1.0)
        elif e <= 3:
            anti_rate = len(words & HIGH_E_SIGNALS) / max(len(HIGH_E_SIGNALS), 1)
            score += max(1.0 - anti_rate * 3, 0.0)
        else:
            score += 0.5

        checks += 1
        c = profile.patience
        if c >= 7:
            hit_rate = len(words & HIGH_C_SIGNALS) / max(len(HIGH_C_SIGNALS), 1)
            score += min(hit_rate + 0.2, 1.0)
        elif c <= 3:
            hit_rate = len(words & LOW_C_SIGNALS) / max(len(LOW_C_SIGNALS), 1)
            score += min(hit_rate + 0.2, 1.0)
        else:
            score += 0.5

        checks += 1
        f = profile.formality
        if f >= 7:
            hit_rate = len(words & HIGH_F_SIGNALS) / max(len(HIGH_F_SIGNALS), 1)
            score += min(hit_rate + 0.2, 1.0)
        elif f <= 3:
            hit_rate = len(words & LOW_F_SIGNALS) / max(len(LOW_F_SIGNALS), 1)
            score += min(hit_rate + 0.2, 1.0)
        else:
            score += 0.5

        return score / checks if checks > 0 else 0.0

    def score_deliberation_diversity(
        self,
        perspectives: Sequence[Perspective],
    ) -> float:
        if len(perspectives) < 2:
            return 0.0

        convictions = [p.conviction for p in perspectives]
        mean_c = sum(convictions) / len(convictions)
        variance = sum((c - mean_c) ** 2 for c in convictions) / len(convictions)
        std_dev = variance**0.5
        conviction_diversity = min(std_dev / 3.0, 1.0)

        actions = [p.recommends_action for p in perspectives]
        true_count = sum(actions)
        minority = min(true_count, len(actions) - true_count)
        action_diversity = minority / (len(actions) / 2) if len(actions) > 1 else 0.0

        word_sets = []
        for p in perspectives:
            text = p.position + " " + " ".join(p.concerns) + " " + " ".join(p.opportunities)
            word_sets.append(set(re.findall(r"\b\w+\b", text.lower())))

        jaccard_distances = []
        for i in range(len(word_sets)):
            for j in range(i + 1, len(word_sets)):
                intersection = len(word_sets[i] & word_sets[j])
                union = len(word_sets[i] | word_sets[j])
                jaccard_distances.append(1.0 - (intersection / union if union > 0 else 0.0))

        text_diversity = (
            sum(jaccard_distances) / len(jaccard_distances) if jaccard_distances else 0.0
        )

        return (conviction_diversity * 0.3) + (action_diversity * 0.3) + (text_diversity * 0.4)

    def score_response_quality(
        self,
        perspective: Perspective,
        expected_themes: list[str],
    ) -> float:
        if not perspective.json_valid:
            return 0.0

        text = (
            perspective.position
            + " "
            + " ".join(perspective.concerns)
            + " "
            + " ".join(perspective.opportunities)
        ).lower()

        themes_hit = sum(1 for theme in expected_themes if theme.lower() in text)
        theme_score = themes_hit / len(expected_themes) if expected_themes else 0.5

        word_count = len(text.split())
        specificity = min(word_count / 80, 1.0)

        detail_count = len(perspective.concerns) + len(perspective.opportunities)
        detail_score = min(detail_count / 4, 1.0)

        return (theme_score * 0.5) + (specificity * 0.25) + (detail_score * 0.25)

    def score_council_run(
        self,
        perspectives: list[Perspective],
        profiles: list[DECFProfile],
        expected_themes: list[str],
    ) -> dict[str, BenchmarkScore]:
        profile_map = {p.persona_id: p for p in profiles}
        diversity = self.score_deliberation_diversity(perspectives)

        scores: dict[str, BenchmarkScore] = {}
        for p in perspectives:
            profile = profile_map.get(p.persona)
            adherence = self.score_persona_adherence(p, profile) if profile else 0.0
            quality = self.score_response_quality(p, expected_themes)
            compliance = self.score_json_compliance(p)

            weighted = (
                adherence * WEIGHTS.persona_adherence
                + diversity * WEIGHTS.deliberation_diversity
                + quality * WEIGHTS.response_quality
                + compliance * WEIGHTS.json_compliance
            )

            scores[p.persona] = BenchmarkScore(
                persona_adherence=round(adherence, 3),
                deliberation_diversity=round(diversity, 3),
                response_quality=round(quality, 3),
                json_compliance=round(compliance, 3),
                weighted_total=round(weighted, 3),
            )

        return scores
