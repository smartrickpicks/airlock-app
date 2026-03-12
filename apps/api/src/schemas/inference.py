"""Pydantic schemas for MAGS inference engine.

Handles profile inference from behavioral signals:
- DECF drives (Dominance, Extraversion, Patience, Formality)
- Profile matching via Euclidean distance to 17 canonical vectors
- Confidence scoring with multi-source aggregation
- BMY (Build My Workspace) intake flow
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

# --- Enums ---


class MetaArchetype(StrEnum):
    """Three meta-archetypes that group the 17 PI profiles."""

    DRIVER = "driver"
    ENFORCER = "enforcer"
    INTERPRETER = "interpreter"


class InteractionMode(StrEnum):
    """How Otto interacts with this user."""

    AUTONOMOUS = "autonomous"
    AUTONOMOUS_WITH_CHECKPOINTS = "autonomous_with_checkpoints"
    DRAFT_THEN_REVIEW = "draft_then_review"
    COLLABORATIVE = "collaborative"
    SUPERVISED = "supervised"
    ACT_THEN_REPORT = "act_then_report"


class SignalSource(StrEnum):
    """Where profile signals originate."""

    CONVERSATION = "conversation"
    LINKEDIN = "linkedin"
    RESUME = "resume"
    BEHAVIORAL = "behavioral"
    USER_OVERRIDE = "user_override"


class CognitiveMode(StrEnum):
    """Workspace cognitive processing preference."""

    VISUAL = "visual"
    VERBAL_PROCEDURAL = "verbal_procedural"
    VERBAL_NARRATIVE = "verbal_narrative"
    INTERACTIVE = "interactive"
    CONTEXT_DEPENDENT = "context_dependent"


class InformationDensity(StrEnum):
    """How much information the user prefers at once."""

    LOW = "low"
    MEDIUM = "medium"
    MEDIUM_HIGH = "medium_high"
    HIGH = "high"


class InterfaceStructure(StrEnum):
    """How structured the UI should be."""

    EXPLORATORY = "exploratory"
    GUIDED = "guided"
    GUIDED_FLEXIBLE = "guided_flexible"


class UpdatePace(StrEnum):
    """How frequently the user wants updates."""

    ALERTS = "alerts"
    BATCH = "batch"
    REALTIME = "realtime"


class ExplanationStyle(StrEnum):
    """How Otto explains its reasoning."""

    SUMMARY_FIRST = "summary_first"
    EVIDENCE_FIRST = "evidence_first"
    LABELED = "labeled"


# --- Core Models ---


class DECFDrives(BaseModel):
    """The four behavioral drives that define a PI profile.

    Each drive is scored on a 1-10 scale.
    D = Dominance, E = Extraversion, C = Patience, F = Formality.
    """

    dominance: float = Field(ge=1.0, le=10.0, description="Drive for control, results, and action")
    extraversion: float = Field(
        ge=1.0, le=10.0, description="Drive for social interaction and collaboration"
    )
    patience: float = Field(
        ge=1.0, le=10.0, description="Drive for stability, patience, and consistency"
    )
    formality: float = Field(
        ge=1.0, le=10.0, description="Drive for structure, rules, and precision"
    )

    def as_vector(self) -> list[float]:
        """Return drives as a 4-element vector for distance computation."""
        return [self.dominance, self.extraversion, self.patience, self.formality]


class WorkspaceConfig(BaseModel):
    """Workspace UI/UX preferences inferred from profile."""

    cognitive_mode: CognitiveMode
    information_density: InformationDensity
    interface_structure: InterfaceStructure
    update_pace: UpdatePace
    explanation_style: ExplanationStyle


class OttoConfig(BaseModel):
    """How Otto (the AI agent) should behave for this profile."""

    default_archetype: str = Field(
        description="Otto's primary archetype: analyst, strategist, executor, connector, guardian, architect"
    )
    autonomy_ceiling: float = Field(
        ge=0.0,
        le=1.0,
        description="Maximum autonomy level (0=fully supervised, 1=fully autonomous)",
    )
    interaction_mode: InteractionMode


class ProfileMatch(BaseModel):
    """Result of matching inferred drives to a canonical PI profile."""

    profile_id: str = Field(description="Matched profile ID (e.g., 'maverick', 'captain')")
    profile_name: str = Field(description="Human-readable profile name")
    distance: float = Field(
        ge=0.0, description="Euclidean distance from inferred drives to canonical vector"
    )
    confidence: float = Field(ge=0.0, le=1.0, description="Overall confidence in this match")
    meta_archetype: MetaArchetype
    drives: DECFDrives
    workspace_config: WorkspaceConfig
    otto_config: OttoConfig

    # Runner-up for transparency
    runner_up_id: str | None = Field(default=None, description="Second-closest profile ID")
    runner_up_distance: float | None = Field(
        default=None, description="Distance to second-closest profile"
    )


class ProfileCandidate(BaseModel):
    """A candidate profile with distance score, used in ranking."""

    profile_id: str
    profile_name: str
    distance: float
    meta_archetype: MetaArchetype
    drives: DECFDrives
    workspace_config: WorkspaceConfig
    otto_config: OttoConfig


# --- Provenance Models ---


class DriveEvidence(BaseModel):
    """Per-drive signal attribution for provenance transparency."""

    drive: str = Field(description="Drive name: dominance, extraversion, patience, formality")
    value: float = Field(ge=1.0, le=10.0, description="Final inferred value for this drive")
    signals: list[dict[str, Any]] = Field(
        default_factory=list,
        description="List of signal contributions: [{source, contribution, reason}]",
    )


class BehavioralTension(BaseModel):
    """A detected conflict between two behavioral signals."""

    drive_a: str
    value_a: float
    drive_b: str
    value_b: float
    description: str = Field(description="Otto-voice explanation of the tension")


class ProfileDistance(BaseModel):
    """Distance from inferred drives to a canonical profile — all 17 shown."""

    profile_id: str
    profile_name: str
    distance: float = Field(ge=0.0)
    meta_archetype: MetaArchetype
    is_match: bool = False
    is_runner_up: bool = False
    rejection_reason: str | None = Field(
        default=None,
        description="Why this profile wasn't selected (only for non-matches)",
    )


class ProvenanceData(BaseModel):
    """Full inference reasoning chain for the Provenance Panel."""

    all_distances: list[ProfileDistance] = Field(
        description="Euclidean distances to all 17 canonical profiles, sorted closest-first"
    )
    drive_evidence: list[DriveEvidence] = Field(
        description="Per-drive signal attribution with source citations"
    )
    behavioral_tensions: list[BehavioralTension] = Field(
        default_factory=list,
        description="Detected conflicts between behavioral signals",
    )
    raw_adjustments: dict[str, Any] = Field(
        default_factory=dict,
        description="Raw signal processing breakdown from inference engine",
    )


# --- Request / Response Models ---


class DriveSignals(BaseModel):
    """Raw signals extracted from user inputs for drive inference."""

    # Q1: Open-ended goal statement
    goal_statement: str | None = Field(
        default=None,
        max_length=2000,
        description="Free-text answer to 'What are you here to accomplish?'",
    )

    # Q2: Autonomy preference (tappable card selection)
    autonomy_preference: str | None = Field(
        default=None,
        description="Selected autonomy card: 'Run things for me', 'Draft it, I'll review', 'Help me while I drive', 'Just a second opinion'",
    )

    # Q3: Report style preference
    report_style: str | None = Field(
        default=None,
        description="Selected report style: 'Scan summary, then act', 'Read every detail first', 'Ask someone what they think'",
    )

    # Q4: Team size
    team_size: str | None = Field(
        default=None,
        description="Selected team size: 'Solo', '2-5', '5-20', '20+'",
    )

    # Additional signal sources (future enrichment)
    job_title: str | None = Field(
        default=None, description="Job title from LinkedIn or manual entry"
    )
    tenure_years: float | None = Field(default=None, ge=0, description="Average years per role")

    # Metadata
    signal_sources: list[SignalSource] = Field(
        default_factory=lambda: [SignalSource.CONVERSATION],
        description="Which signal sources contributed to these drives",
    )


class InferDrivesRequest(BaseModel):
    """Request to infer DECF drives from behavioral signals."""

    signals: DriveSignals


class InferDrivesResponse(BaseModel):
    """Response with inferred DECF drives and signal attribution."""

    drives: DECFDrives
    signal_sources: list[SignalSource]
    signal_count: int = Field(description="Number of non-null signals used")
    raw_adjustments: dict[str, Any] = Field(
        default_factory=dict,
        description="Breakdown of how each signal contributed to the drives",
    )


class MatchProfileRequest(BaseModel):
    """Request to match DECF drives to the closest canonical profile."""

    drives: DECFDrives


class MatchProfileResponse(BaseModel):
    """Response with the matched profile and alternatives."""

    match: ProfileMatch
    top_candidates: list[ProfileCandidate] = Field(
        default_factory=list,
        description="Top 3 closest profiles for transparency",
    )


class BMYRequest(BaseModel):
    """Full Build My Workspace intake request.

    Combines signal extraction + profile matching + workspace config
    in a single call for the Workspace Forge onboarding flow.
    """

    signals: DriveSignals


class BMYResponse(BaseModel):
    """Full Build My Workspace response with everything Otto needs."""

    # Inferred drives
    drives: DECFDrives
    signal_count: int

    # Profile match
    profile: ProfileMatch
    top_candidates: list[ProfileCandidate] = Field(default_factory=list)

    # Workspace configuration
    workspace_config: WorkspaceConfig
    otto_config: OttoConfig

    # Confidence breakdown
    confidence: float = Field(ge=0.0, le=1.0)
    confidence_breakdown: dict[str, float] = Field(
        default_factory=dict,
        description="Confidence contribution per signal source",
    )

    # Narrative (for Otto to explain)
    explanation: str = Field(
        description="Human-readable explanation of why this profile was matched",
    )

    # Provenance (for Inference Provenance Panel)
    provenance: ProvenanceData | None = Field(
        default=None,
        description="Full inference reasoning chain for transparency panel",
    )

    # Suggested next steps
    enrichment_suggestions: list[str] = Field(
        default_factory=list,
        description="Suggestions to increase confidence (e.g., 'Connect LinkedIn')",
    )
