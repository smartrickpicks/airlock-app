"""Inference Provenance Panel — core logic for Glass Box AI.

Shows the full reasoning chain behind Otto's behavioral profile inference:
signal sources, per-drive evidence, all 17 profile distances, rejected
alternatives, and behavioral tension callouts.

Glass Box Dimension: Inference Explainability (+1.2 points → 6→9)
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path

import yaml

# ── Load canonical profiles from YAML ─────────────────────────────────────

_PROFILE_MATCHING_PATH = Path(__file__).parent / "profile-matching.yaml"
_ARCHETYPE_MAPPING_PATH = Path(__file__).parent / "archetype-mapping.yaml"


def _load_canonical_profiles() -> dict[str, dict[str, int]]:
    with open(_PROFILE_MATCHING_PATH) as f:
        data = yaml.safe_load(f)
    return data["profiles"]


def _load_meta_archetype_mapping() -> dict[str, list[str]]:
    with open(_PROFILE_MATCHING_PATH) as f:
        data = yaml.safe_load(f)
    return data.get("meta_archetype_mapping", {})


CANONICAL_PROFILES = _load_canonical_profiles()
META_ARCHETYPE_MAP = _load_meta_archetype_mapping()

# Max possible Euclidean distance across 4 drives (1-10 scale)
MAX_DISTANCE = math.sqrt((10 - 1) ** 2 * 4)  # ~18.0

# ── Drive labels ──────────────────────────────────────────────────────────

DRIVE_KEYS = ["D", "E", "C", "F"]
DRIVE_NAMES = {
    "D": "dominance",
    "E": "extraversion",
    "C": "patience",
    "F": "formality",
}
DRIVE_FULL_TO_KEY = {v: k for k, v in DRIVE_NAMES.items()}


# ── Data Classes ──────────────────────────────────────────────────────────


@dataclass
class SignalContribution:
    """A single signal source's contribution to a drive value."""
    source: str        # e.g. "goal_statement", "career", "autonomy_preference"
    contribution: float  # delta applied to the drive
    reason: str        # human-readable explanation

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "contribution": round(self.contribution, 2),
            "reason": self.reason,
        }


@dataclass
class DriveEvidence:
    """Per-drive signal attribution for provenance transparency."""
    drive: str      # "dominance", "extraversion", "patience", "formality"
    value: float    # final inferred value (1-10)
    signals: list[SignalContribution] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "drive": self.drive,
            "value": round(self.value, 1),
            "signals": [s.to_dict() for s in self.signals],
        }


@dataclass
class BehavioralTension:
    """A detected conflict between two behavioral signals."""
    drive_a: str
    value_a: float
    drive_b: str
    value_b: float
    description: str

    def to_dict(self) -> dict:
        return {
            "drive_a": self.drive_a,
            "value_a": round(self.value_a, 1),
            "drive_b": self.drive_b,
            "value_b": round(self.value_b, 1),
            "description": self.description,
        }


@dataclass
class ProfileDistance:
    """Distance from inferred drives to a canonical profile."""
    profile_id: str
    profile_name: str
    distance: float
    confidence: float     # 1 - (distance / max_distance)
    meta_archetype: str   # "driver", "enforcer", "interpreter"
    canonical_decf: dict[str, int]
    is_match: bool = False
    is_runner_up: bool = False
    rejection_reason: str | None = None

    def to_dict(self) -> dict:
        return {
            "profile_id": self.profile_id,
            "profile_name": self.profile_name,
            "distance": round(self.distance, 3),
            "confidence": round(self.confidence, 4),
            "meta_archetype": self.meta_archetype,
            "canonical_decf": self.canonical_decf,
            "is_match": self.is_match,
            "is_runner_up": self.is_runner_up,
            "rejection_reason": self.rejection_reason,
        }


@dataclass
class ProvenanceResult:
    """Full inference reasoning chain for the Provenance Panel."""
    inferred_decf: dict[str, float]
    match_profile: str
    match_distance: float
    match_confidence: float
    runner_up_profile: str | None
    all_distances: list[ProfileDistance]
    drive_evidence: list[DriveEvidence]
    behavioral_tensions: list[BehavioralTension]
    raw_adjustments: dict  # original signal processing breakdown
    signal_count: int

    def to_dict(self) -> dict:
        return {
            "inferred_decf": {k: round(v, 1) for k, v in self.inferred_decf.items()},
            "match_profile": self.match_profile,
            "match_distance": round(self.match_distance, 3),
            "match_confidence": round(self.match_confidence, 4),
            "runner_up_profile": self.runner_up_profile,
            "all_distances": [d.to_dict() for d in self.all_distances],
            "drive_evidence": [e.to_dict() for e in self.drive_evidence],
            "behavioral_tensions": [t.to_dict() for t in self.behavioral_tensions],
            "raw_adjustments": self.raw_adjustments,
            "signal_count": self.signal_count,
        }


# ── Core Provenance Functions ─────────────────────────────────────────────


def compute_all_distances(
    inferred: dict[str, float],
    match_id: str | None = None,
    runner_up_id: str | None = None,
) -> list[ProfileDistance]:
    """Compute Euclidean distance from inferred DECF to all 17 canonical profiles.

    Returns sorted list (closest first) with match/runner-up flags
    and rejection reasons for non-matches.
    """
    results = []
    for name, profile in CANONICAL_PROFILES.items():
        distance = math.sqrt(
            sum(
                (inferred.get(k, 5) - profile[k]) ** 2
                for k in DRIVE_KEYS
            )
        )
        confidence = max(0.0, 1.0 - (distance / MAX_DISTANCE))
        is_match = name == match_id
        is_runner = name == runner_up_id

        rejection_reason = None
        if not is_match and not is_runner:
            rejection_reason = _generate_rejection_reason(inferred, profile, name)

        meta = _resolve_meta_archetype(name)

        results.append(ProfileDistance(
            profile_id=name,
            profile_name=name.title(),
            distance=round(distance, 3),
            confidence=round(confidence, 4),
            meta_archetype=meta,
            canonical_decf=profile,
            is_match=is_match,
            is_runner_up=is_runner,
            rejection_reason=rejection_reason,
        ))

    results.sort(key=lambda x: x.distance)
    return results


def build_drive_evidence(
    drives: dict[str, float],
    raw_adjustments: dict | None = None,
) -> list[DriveEvidence]:
    """Build per-drive signal attribution from raw adjustment data.

    Traces each drive value back to the signals that contributed to it.
    """
    if raw_adjustments is None:
        raw_adjustments = {}

    evidence_list = []
    for key in DRIVE_KEYS:
        drive_name = DRIVE_NAMES[key]
        value = drives.get(key, drives.get(drive_name, 5.0))
        signals = []

        # Goal statement contributions
        goal_adj = raw_adjustments.get("goal_statement", {})
        if drive_name in goal_adj and goal_adj[drive_name] != 0:
            delta = goal_adj[drive_name]
            signals.append(SignalContribution(
                source="goal_statement",
                contribution=delta,
                reason=_goal_signal_reason(drive_name, delta),
            ))

        # Autonomy preference
        auto_adj = raw_adjustments.get("autonomy_preference", {})
        if drive_name == "formality" and "formality" in auto_adj:
            f_val = auto_adj["formality"]
            signals.append(SignalContribution(
                source="autonomy_preference",
                contribution=f_val - 5,  # delta from neutral
                reason=f"Autonomy selection set formality to {f_val}",
            ))

        # Report style
        report_adj = raw_adjustments.get("report_style", {})
        adj_key = f"{drive_name}_adjust"
        if adj_key in report_adj and report_adj[adj_key] != 0:
            signals.append(SignalContribution(
                source="report_style",
                contribution=report_adj[adj_key],
                reason=f"Report style preference ({report_adj.get('meta_archetype', 'unknown')} pattern)",
            ))

        # Team size
        team_adj = raw_adjustments.get("team_size", {})
        if adj_key in team_adj and team_adj[adj_key] != 0:
            signals.append(SignalContribution(
                source="team_size",
                contribution=team_adj[adj_key],
                reason=f"Team scale: {team_adj.get('tier', 'unknown')}",
            ))

        # Career signals
        career_adj = raw_adjustments.get("career", {})
        if adj_key in career_adj and career_adj[adj_key] != 0:
            signals.append(SignalContribution(
                source="career",
                contribution=career_adj[adj_key],
                reason="Career title and tenure pattern",
            ))

        # Conversation signals (from DECF signal word analysis)
        convo_adj = raw_adjustments.get("conversation", {})
        if drive_name in convo_adj and convo_adj[drive_name] != 0:
            signals.append(SignalContribution(
                source="conversation",
                contribution=convo_adj[drive_name],
                reason=f"Behavioral signal words detected in conversation ({_signal_direction(convo_adj[drive_name])})",
            ))

        # LinkedIn signals
        linkedin_adj = raw_adjustments.get("linkedin", {})
        if adj_key in linkedin_adj and linkedin_adj[adj_key] != 0:
            signals.append(SignalContribution(
                source="linkedin",
                contribution=linkedin_adj[adj_key],
                reason="LinkedIn profile analysis",
            ))

        # Baseline fallback — no signals contributed
        if not signals:
            signals.append(SignalContribution(
                source="baseline",
                contribution=0,
                reason="No direct signal — neutral midpoint (5.0)",
            ))

        evidence_list.append(DriveEvidence(
            drive=drive_name,
            value=value,
            signals=signals,
        ))

    return evidence_list


def detect_behavioral_tensions(
    drives: dict[str, float],
) -> list[BehavioralTension]:
    """Detect conflicts between behavioral signals.

    Tensions arise when drives that typically correlate are in opposition.
    These are not errors — they're interesting behavioral patterns worth surfacing.
    """
    d = drives.get("D", drives.get("dominance", 5))
    e = drives.get("E", drives.get("extraversion", 5))
    c = drives.get("C", drives.get("patience", 5))
    f = drives.get("F", drives.get("formality", 5))

    tensions = []

    # Low patience + high formality = "wants speed but demands process"
    if c <= 3 and f >= 7:
        tensions.append(BehavioralTension(
            drive_a="patience",
            value_a=c,
            drive_b="formality",
            value_b=f,
            description=(
                f"Patience is {c:.0f} (move fast) but formality is {f:.0f} (want structure). "
                f"Fast movers who demand heavy process often hit friction with themselves. "
                f"Which one wins on a Tuesday?"
            ),
        ))

    # High dominance + high patience = "wants control but moves slowly"
    if d >= 7 and c >= 7:
        tensions.append(BehavioralTension(
            drive_a="dominance",
            value_a=d,
            drive_b="patience",
            value_b=c,
            description=(
                f"Dominance is {d:.0f} (drive for results) but patience is {c:.0f} "
                f"(methodical pace). Wants to be in charge but doesn't rush. That's rare — "
                f"bottleneck is usually other people's speed, not your own."
            ),
        ))

    # High extraversion + high formality = "social but rule-bound"
    if e >= 7 and f >= 7:
        tensions.append(BehavioralTension(
            drive_a="extraversion",
            value_a=e,
            drive_b="formality",
            value_b=f,
            description=(
                f"Extraversion is {e:.0f} (collaborative) but formality is {f:.0f} (structured). "
                f"Wants to work with people but also wants things done right. "
                f"Enjoys the brainstorm but writes the follow-up email with action items."
            ),
        ))

    # Low dominance + low patience = "doesn't lead but wants speed"
    if d <= 3 and c <= 3:
        tensions.append(BehavioralTension(
            drive_a="dominance",
            value_a=d,
            drive_b="patience",
            value_b=c,
            description=(
                f"Dominance is {d:.0f} (supportive) but patience is {c:.0f} (urgent). "
                f"Doesn't want to lead the charge but wants the charge to happen now. "
                f"Sees what needs doing before anyone else — and gets frustrated waiting "
                f"for someone to call the play."
            ),
        ))

    # High dominance + low extraversion = "commanding loner"
    if d >= 7 and e <= 3:
        tensions.append(BehavioralTension(
            drive_a="dominance",
            value_a=d,
            drive_b="extraversion",
            value_b=e,
            description=(
                f"Dominance is {d:.0f} (decisive) but extraversion is {e:.0f} (independent). "
                f"Drives hard but doesn't rally the room. Leads by output, not speeches. "
                f"People follow because they see results, not because they were invited."
            ),
        ))

    # Low dominance + high extraversion = "influencer, not commander"
    if d <= 3 and e >= 7:
        tensions.append(BehavioralTension(
            drive_a="dominance",
            value_a=d,
            drive_b="extraversion",
            value_b=e,
            description=(
                f"Dominance is {d:.0f} (supportive) but extraversion is {e:.0f} (social). "
                f"Doesn't push for control but lights up a room. Influence without authority. "
                f"People listen because they want to, not because they have to."
            ),
        ))

    return tensions


def build_provenance(
    inferred_decf: dict[str, float],
    raw_adjustments: dict | None = None,
    signal_count: int = 0,
) -> ProvenanceResult:
    """Build complete provenance chain from inferred DECF scores.

    This is the main entry point for the Inference Provenance Panel.
    Takes the inferred drive values and raw signal adjustments,
    returns the full reasoning chain.
    """
    all_distances = compute_all_distances(inferred_decf)

    # Best match = closest profile
    match = all_distances[0]
    runner_up = all_distances[1] if len(all_distances) > 1 else None

    # Re-compute with match/runner-up flags
    all_distances = compute_all_distances(
        inferred_decf,
        match_id=match.profile_id,
        runner_up_id=runner_up.profile_id if runner_up else None,
    )

    drive_evidence = build_drive_evidence(inferred_decf, raw_adjustments)
    tensions = detect_behavioral_tensions(inferred_decf)

    return ProvenanceResult(
        inferred_decf=inferred_decf,
        match_profile=match.profile_id,
        match_distance=match.distance,
        match_confidence=match.confidence,
        runner_up_profile=runner_up.profile_id if runner_up else None,
        all_distances=all_distances,
        drive_evidence=drive_evidence,
        behavioral_tensions=tensions,
        raw_adjustments=raw_adjustments or {},
        signal_count=signal_count,
    )


# ── Internal Helpers ──────────────────────────────────────────────────────


def _resolve_meta_archetype(profile_id: str) -> str:
    """Resolve a profile to its primary meta-archetype."""
    for archetype, profiles in META_ARCHETYPE_MAP.items():
        if profile_id in profiles:
            return archetype
    return "interpreter"  # default


def _generate_rejection_reason(
    inferred: dict[str, float],
    canonical: dict[str, int],
    profile_name: str,
) -> str:
    """Explain why a profile wasn't selected — largest drive divergence."""
    deltas = []
    for key in DRIVE_KEYS:
        inf_val = inferred.get(key, inferred.get(DRIVE_NAMES[key], 5))
        can_val = canonical[key]
        deltas.append((abs(inf_val - can_val), DRIVE_NAMES[key], inf_val, can_val))

    deltas.sort(reverse=True)
    biggest = deltas[0]
    return (
        f"{biggest[1].title()} divergence: "
        f"you're {biggest[2]:.1f}, {profile_name.title()} canonical is {biggest[3]:.0f} "
        f"(gap: {biggest[0]:.1f})"
    )


def _goal_signal_reason(drive: str, delta: float) -> str:
    """Human-readable reason for goal statement contribution."""
    direction = "boosted" if delta > 0 else "reduced"
    descriptors = {
        "dominance": "action-oriented language (scale, grow, lead, own)",
        "extraversion": "collaborative language (team, together, share, align)",
        "patience": "methodical language (careful, thorough, step-by-step)",
        "formality": "structured language (process, standard, documentation)",
    }
    desc = descriptors.get(drive, f"{drive} signals")
    return f"Goal statement {direction} {drive}: {desc}"


def _signal_direction(delta: float) -> str:
    """Short label for signal direction."""
    if delta > 1:
        return "strong positive"
    if delta > 0:
        return "positive"
    if delta < -1:
        return "strong negative"
    if delta < 0:
        return "negative"
    return "neutral"
