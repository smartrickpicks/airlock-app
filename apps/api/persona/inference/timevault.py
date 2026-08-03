"""TimeVault — behavioral state snapshots for longitudinal analysis.

Captures a frozen snapshot of Otto's behavioral state at significant moments
(session boundaries, drift events, energy collapses, governance escalations).
These snapshots form a time-series of behavioral intelligence that enables
retrospective analysis, outcome tagging, and pattern discovery.

Biological analogue: TimeVaults (PubMed 41538410) — cellular mechanisms
that preserve molecular state for later retrieval and temporal comparison.

Pure dataclasses + one entry-point function. No persistence, no API calls.
Downstream consumers (session-manager, witness) handle storage.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from inference.drift_scorer import CANONICAL_PROFILES


# ── VaultTrigger ────────────────────────────────────────────────────────


class VaultTrigger:
    """Valid triggers that cause a TimeVault snapshot."""

    ALL: frozenset[str] = frozenset({
        "session_begin",
        "session_end",
        "drift_detected",
        "energy_collapse",
        "rock_awarded",
        "governance_escalation",
        "manual",
    })

    @staticmethod
    def validate(trigger: str) -> str:
        """Validate and return the trigger, or raise ValueError."""
        if trigger not in VaultTrigger.ALL:
            raise ValueError(
                f"Invalid trigger '{trigger}'. "
                f"Valid triggers: {sorted(VaultTrigger.ALL)}"
            )
        return trigger


# ── VaultState ──────────────────────────────────────────────────────────


@dataclass(frozen=True)
class VaultState:
    """Frozen behavioral state snapshot at a single point in time."""

    # Core session state
    active_persona: str
    active_chamber: str
    playbook_node: str | None = None
    decf: dict[str, int] | None = None
    belief_energy: dict[str, float] | None = None
    attention_profile: list[float] | None = None

    # Drift
    drift_fidelity: float | None = None
    drift_severity: str | None = None
    drift_drives: list[str] | None = None
    fidelity_trend: list[float] | None = None

    # Rhythm
    rhythm_dominant_period_hours: float | None = None
    rhythm_tempo: str | None = None
    rhythm_confidence: float | None = None

    # Novelty
    novelty_score: float | None = None
    novelty_category: str | None = None
    dharma_tier: str | None = None

    # Temporal
    generation: str | None = None
    part_of_day: str | None = None
    gap_since_last: str | None = None
    cadence: str | None = None

    # Team + commitments
    sovereign_balance: list[float] | None = None
    open_items: list[str] = field(default_factory=list)

    @classmethod
    def from_session_and_inference(
        cls,
        session_data: dict[str, Any],
        drift_summary: dict[str, Any] | None = None,
        rhythm: dict[str, Any] | None = None,
        temporal: dict[str, Any] | None = None,
        novelty: dict[str, Any] | None = None,
    ) -> VaultState:
        """Build a VaultState from session data and optional inference results.

        Args:
            session_data: User session dict (see sessions/schema.yaml).
            drift_summary: Output from DriftScorer (fidelity, severity, drives, trend).
            rhythm: Output from detect_rhythm() (dominant_period_hours, tempo, confidence).
            temporal: Output from compute_awareness() (identity, situation).
            novelty: Output from novelty scorer (score, category, routing).

        Returns:
            Frozen VaultState snapshot.
        """
        # Core session fields
        active_persona = session_data.get("active_persona", "Captain")
        active_chamber = session_data.get("active_chamber", "Discovery")

        playbook = session_data.get("playbook") or {}
        playbook_node = playbook.get("current_node")

        # DECF lookup — session uses title case, profiles use lowercase
        persona_key = active_persona.lower()
        decf = dict(CANONICAL_PROFILES[persona_key]) if persona_key in CANONICAL_PROFILES else None

        # Belief state
        belief_state = session_data.get("belief_state") or {}
        belief_energy = belief_state.get("energy")
        attention_profile = belief_state.get("last_attention_profile")

        # Drift
        drift_summary = drift_summary or {}
        drift_fidelity = drift_summary.get("fidelity")
        drift_severity = drift_summary.get("drift_severity")
        drift_drives = drift_summary.get("drift_drives")
        fidelity_trend = drift_summary.get("fidelity_trend")

        # Rhythm
        rhythm = rhythm or {}
        rhythm_dominant = rhythm.get("dominant_period_hours")
        rhythm_tempo = rhythm.get("session_tempo")
        rhythm_confidence = rhythm.get("confidence")

        # Novelty
        novelty = novelty or {}
        novelty_score = novelty.get("score")
        novelty_category = novelty.get("category")
        novelty_routing = novelty.get("routing") or {}
        dharma_tier = novelty_routing.get("dharma_tier")

        # Temporal
        temporal = temporal or {}
        identity = temporal.get("identity") or {}
        situation = temporal.get("situation") or {}
        generation = identity.get("generation")
        part_of_day = situation.get("part_of_day")
        gap_since_last = situation.get("gap_since_last_session")
        cadence = situation.get("cadence")

        # Team + commitments
        team = session_data.get("team") or {}
        sovereign_balance = team.get("sovereign_balance")
        open_items = session_data.get("open_items") or []

        return cls(
            active_persona=active_persona,
            active_chamber=active_chamber,
            playbook_node=playbook_node,
            decf=decf,
            belief_energy=belief_energy,
            attention_profile=attention_profile,
            drift_fidelity=drift_fidelity,
            drift_severity=drift_severity,
            drift_drives=drift_drives,
            fidelity_trend=fidelity_trend,
            rhythm_dominant_period_hours=rhythm_dominant,
            rhythm_tempo=rhythm_tempo,
            rhythm_confidence=rhythm_confidence,
            novelty_score=novelty_score,
            novelty_category=novelty_category,
            dharma_tier=dharma_tier,
            generation=generation,
            part_of_day=part_of_day,
            gap_since_last=gap_since_last,
            cadence=cadence,
            sovereign_balance=sovereign_balance,
            open_items=list(open_items),
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dict with nested groups for drift, rhythm, novelty, temporal."""
        return {
            "active_persona": self.active_persona,
            "active_chamber": self.active_chamber,
            "playbook_node": self.playbook_node,
            "decf": self.decf,
            "belief_energy": self.belief_energy,
            "attention_profile": self.attention_profile,
            "drift": {
                "fidelity": self.drift_fidelity,
                "severity": self.drift_severity,
                "drives": self.drift_drives,
                "fidelity_trend": self.fidelity_trend,
            },
            "rhythm": {
                "dominant_period_hours": self.rhythm_dominant_period_hours,
                "tempo": self.rhythm_tempo,
                "confidence": self.rhythm_confidence,
            },
            "novelty": {
                "score": self.novelty_score,
                "category": self.novelty_category,
                "dharma_tier": self.dharma_tier,
            },
            "temporal": {
                "generation": self.generation,
                "part_of_day": self.part_of_day,
                "gap_since_last": self.gap_since_last,
                "cadence": self.cadence,
            },
            "sovereign_balance": self.sovereign_balance,
            "open_items": self.open_items,
        }


# ── TimeVault ───────────────────────────────────────────────────────────


@dataclass
class TimeVault:
    """A timestamped behavioral state snapshot with outcome tagging.

    Immutable state + mutable outcome layer. The state is frozen at capture
    time; outcomes are tagged later when we know what happened next.
    """

    user_id: str
    trigger: str
    state: VaultState
    trigger_context: str | None = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    vault_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    outcome: str | None = None
    outcome_tagged_at: str | None = None
    notes: str | None = None

    def tag_outcome(self, outcome: str, notes: str | None = None) -> None:
        """Tag this vault with a retrospective outcome label.

        Args:
            outcome: Outcome label (e.g. 'positive', 'negative', 'neutral').
            notes: Optional free-text annotation.
        """
        self.outcome = outcome
        self.outcome_tagged_at = datetime.now(timezone.utc).isoformat()
        self.notes = notes

    def to_dict(self) -> dict[str, Any]:
        """Serialize full vault to dict for storage."""
        return {
            "vault_id": self.vault_id,
            "user_id": self.user_id,
            "trigger": self.trigger,
            "trigger_context": self.trigger_context,
            "timestamp": self.timestamp,
            "state": self.state.to_dict(),
            "outcome": self.outcome,
            "outcome_tagged_at": self.outcome_tagged_at,
            "notes": self.notes,
        }


# ── Entry Point ─────────────────────────────────────────────────────────


def capture_state(
    user_id: str,
    trigger: str,
    session_data: dict[str, Any],
    trigger_context: str | None = None,
    drift_summary: dict[str, Any] | None = None,
    rhythm: dict[str, Any] | None = None,
    temporal: dict[str, Any] | None = None,
    novelty: dict[str, Any] | None = None,
) -> TimeVault:
    """Capture a behavioral state snapshot as a TimeVault.

    Main entry point. Validates the trigger, builds VaultState from
    session + inference data, wraps it in a TimeVault with metadata.

    Args:
        user_id: User identifier.
        trigger: One of VaultTrigger.ALL.
        session_data: Current session state dict.
        trigger_context: Optional human-readable context for why this was triggered.
        drift_summary: Drift scorer output.
        rhythm: Rhythm detector output.
        temporal: Temporal awareness output.
        novelty: Novelty scorer output.

    Returns:
        TimeVault instance ready for storage or outcome tagging.

    Raises:
        ValueError: If trigger is not in VaultTrigger.ALL.
    """
    VaultTrigger.validate(trigger)

    state = VaultState.from_session_and_inference(
        session_data=session_data,
        drift_summary=drift_summary,
        rhythm=rhythm,
        temporal=temporal,
        novelty=novelty,
    )

    return TimeVault(
        user_id=user_id,
        trigger=trigger,
        state=state,
        trigger_context=trigger_context,
    )
