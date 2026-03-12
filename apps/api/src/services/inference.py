"""MAGS Inference Engine — Profile matching and drive inference.

Two main components:
1. ProfileMatchingEngine — Loads airlock-persona YAML profiles at startup,
   caches canonical DECF vectors, computes Euclidean distance matching.
2. InferenceService — Orchestrates signal extraction → drive inference →
   profile matching → confidence scoring → BMY response.

Architecture notes:
- Hybrid inference: structured signal tables first, LLM fallback for
  open-ended text analysis (goal_statement language style).
- All 17 PI profiles are matchable.
- Confidence scoring follows airlock-persona/inference/confidence-rules.yaml.
- Deep Research Rec #4: tie-breaking uses profile population_pct as a prior.
"""

from __future__ import annotations

import logging
import math
import re
from pathlib import Path
from typing import Any

import yaml

from src.config import settings
from src.schemas.inference import (
    BehavioralTension,
    BMYRequest,
    BMYResponse,
    CognitiveMode,
    DECFDrives,
    DriveEvidence,
    ExplanationStyle,
    InferDrivesRequest,
    InferDrivesResponse,
    InformationDensity,
    InteractionMode,
    InterfaceStructure,
    MatchProfileRequest,
    MatchProfileResponse,
    MetaArchetype,
    OttoConfig,
    ProfileCandidate,
    ProfileDistance,
    ProfileMatch,
    ProvenanceData,
    SignalSource,
    UpdatePace,
    WorkspaceConfig,
)

logger = logging.getLogger(__name__)


def _fuzzy_match_signal(key: str, signal_map: dict[str, Any]) -> dict[str, Any]:
    """Fuzzy-match a signal key against a signal map.

    Tries exact match first, then partial substring matching.
    Returns the matched signal dict or empty dict if no match.
    """
    signal = signal_map.get(key, {})
    if signal:
        return signal
    key_lower = key.lower()
    for map_key, val in signal_map.items():
        if key_lower in map_key.lower() or map_key.lower() in key_lower:
            return val
    return {}


class ProfileMatchingEngine:
    """Loads and caches canonical PI profile vectors for Euclidean distance matching.

    Reads YAML profiles from airlock-persona at startup and builds
    an in-memory index of 17 canonical DECF vectors.
    """

    def __init__(self, persona_path: Path | None = None) -> None:
        self._persona_path = persona_path or Path(settings.persona_repo_path)
        self._profiles: dict[str, dict[str, Any]] = {}
        self._canonical_vectors: dict[str, list[float]] = {}
        self._inference_rules: dict[str, Any] = {}
        self._confidence_rules: dict[str, Any] = {}
        self._matching_rules: dict[str, Any] = {}
        self._loaded = False

    def load(self) -> None:
        """Load all profile YAMLs and inference rules into memory."""
        self._load_profiles()
        self._load_inference_rules()

        if self._profiles:
            self._loaded = True
            logger.info(
                "ProfileMatchingEngine loaded: %d profiles, %d canonical vectors",
                len(self._profiles),
                len(self._canonical_vectors),
            )
        else:
            logger.warning("ProfileMatchingEngine loaded but no profiles found")

    def _load_profiles(self) -> None:
        """Load all 17 profile YAML files."""
        profiles_dir = self._persona_path / "profiles"
        if not profiles_dir.exists():
            logger.warning("Profiles directory not found: %s", profiles_dir)
            return

        for yaml_file in sorted(profiles_dir.glob("*.yaml")):
            try:
                with yaml_file.open() as f:
                    data = yaml.safe_load(f)
            except yaml.YAMLError:
                logger.exception("Failed to parse YAML file: %s", yaml_file)
                continue

            if data and "id" in data and "drives" in data:
                profile_id = data["id"]
                self._profiles[profile_id] = data
                drives = data["drives"]
                self._canonical_vectors[profile_id] = [
                    float(drives.get("dominance", 5)),
                    float(drives.get("extraversion", 5)),
                    float(drives.get("patience", 5)),
                    float(drives.get("formality", 5)),
                ]
                logger.debug(
                    "Loaded profile: %s → %s", profile_id, self._canonical_vectors[profile_id]
                )

    def _load_inference_rules(self) -> None:
        """Load drive-signals, profile-matching, and confidence-rules YAML."""
        inference_dir = self._persona_path / "inference"
        if not inference_dir.exists():
            logger.warning("Inference directory not found: %s", inference_dir)
            return

        for rule_file in ["drive-signals.yaml", "profile-matching.yaml", "confidence-rules.yaml"]:
            path = inference_dir / rule_file
            if path.exists():
                try:
                    with path.open() as f:
                        data = yaml.safe_load(f) or {}
                except yaml.YAMLError:
                    logger.exception("Failed to parse inference rule: %s", rule_file)
                    continue

                key = rule_file.replace(".yaml", "").replace("-", "_")
                if "drive" in key:
                    self._inference_rules = data
                elif "matching" in key:
                    self._matching_rules = data
                elif "confidence" in key:
                    self._confidence_rules = data
                logger.debug("Loaded inference rule: %s", rule_file)

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def profile_count(self) -> int:
        return len(self._profiles)

    def get_profile_data(self, profile_id: str) -> dict[str, Any] | None:
        """Get raw profile data by ID."""
        return self._profiles.get(profile_id)

    def get_all_profile_ids(self) -> list[str]:
        """Get all loaded profile IDs."""
        return list(self._profiles.keys())

    def compute_distances(self, drives: DECFDrives) -> list[tuple[str, float]]:
        """Compute Euclidean distance from inferred drives to all 17 canonical vectors.

        Returns a sorted list of (profile_id, distance) tuples, closest first.
        """
        inferred = drives.as_vector()
        distances: list[tuple[str, float]] = []

        for profile_id, canonical in self._canonical_vectors.items():
            dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(inferred, canonical, strict=True)))
            distances.append((profile_id, dist))

        # Sort by distance (ascending), then by population_pct (descending) for tie-breaking
        # Deep Research Rec #4: use population_pct as Bayesian prior for ties
        distances.sort(key=lambda x: (x[1], -self._profiles.get(x[0], {}).get("population_pct", 0)))
        return distances

    def match(self, drives: DECFDrives) -> tuple[ProfileMatch, list[ProfileCandidate]]:
        """Match drives to the closest profile and return top 3 candidates."""
        distances = self.compute_distances(drives)

        if not distances:
            msg = "No profiles loaded — cannot match"
            raise ValueError(msg)

        top_3 = distances[:3]
        candidates: list[ProfileCandidate] = []
        match_result: ProfileMatch | None = None

        for i, (profile_id, dist) in enumerate(top_3):
            profile_data = self._profiles[profile_id]
            canonical_drives = self._canonical_vectors[profile_id]
            meta = self._resolve_meta_archetype(profile_id, drives)
            ws_config = self._extract_workspace_config(profile_data)
            otto_cfg = self._extract_otto_config(profile_data)

            candidate = ProfileCandidate(
                profile_id=profile_id,
                profile_name=profile_data.get("name", profile_id.title()),
                distance=round(dist, 4),
                meta_archetype=meta,
                drives=DECFDrives(
                    dominance=canonical_drives[0],
                    extraversion=canonical_drives[1],
                    patience=canonical_drives[2],
                    formality=canonical_drives[3],
                ),
                workspace_config=ws_config,
                otto_config=otto_cfg,
            )
            candidates.append(candidate)

            if i == 0:
                runner_up_id = distances[1][0] if len(distances) > 1 else None
                runner_up_dist = round(distances[1][1], 4) if len(distances) > 1 else None

                match_result = ProfileMatch(
                    profile_id=profile_id,
                    profile_name=profile_data.get("name", profile_id.title()),
                    distance=round(dist, 4),
                    confidence=0.0,  # Filled in by InferenceService
                    meta_archetype=meta,
                    drives=drives,
                    workspace_config=ws_config,
                    otto_config=otto_cfg,
                    runner_up_id=runner_up_id,
                    runner_up_distance=runner_up_dist,
                )

        if match_result is None:
            msg = "Profile matching produced no result — this should be unreachable"
            raise RuntimeError(msg)
        return match_result, candidates

    def _resolve_meta_archetype(
        self, profile_id: str, inferred_drives: DECFDrives
    ) -> MetaArchetype:
        """Determine meta-archetype from profile ID and drive alignment.

        Controller and Promoter can belong to two categories.
        Per profile-matching.yaml: resolve by strongest drive alignment.
        """
        mapping = self._matching_rules.get("meta_archetype_mapping", {})

        # Find all archetypes this profile belongs to
        memberships: list[str] = []
        for archetype, profiles in mapping.items():
            if profile_id in profiles:
                memberships.append(archetype)

        if len(memberships) == 1:
            return MetaArchetype(memberships[0])

        if len(memberships) > 1:
            # Tie-break for dual-membership profiles
            d, e, _c, f = inferred_drives.as_vector()
            if profile_id == "controller":
                return MetaArchetype.DRIVER if d > f else MetaArchetype.ENFORCER
            if profile_id == "promoter":
                return MetaArchetype.DRIVER if d > e else MetaArchetype.INTERPRETER

        # Fallback: use drive signature heuristic
        d, e, c, f = inferred_drives.as_vector()
        if d >= 7 and c <= 4:
            return MetaArchetype.DRIVER
        if c >= 7 and f >= 7:
            return MetaArchetype.ENFORCER
        return MetaArchetype.INTERPRETER

    def _extract_workspace_config(self, profile_data: dict[str, Any]) -> WorkspaceConfig:
        """Extract workspace config from profile YAML data."""
        ws = profile_data.get("workspace", {})
        return WorkspaceConfig(
            cognitive_mode=CognitiveMode(ws.get("cognitive_mode", "visual")),
            information_density=InformationDensity(ws.get("information_density", "medium")),
            interface_structure=InterfaceStructure(ws.get("interface_structure", "exploratory")),
            update_pace=UpdatePace(ws.get("update_pace", "batch")),
            explanation_style=ExplanationStyle(ws.get("explanation_style", "summary_first")),
        )

    def _extract_otto_config(self, profile_data: dict[str, Any]) -> OttoConfig:
        """Extract Otto agent config from profile YAML data."""
        otto = profile_data.get("otto", {})
        return OttoConfig(
            default_archetype=otto.get("default_archetype", "executor"),
            autonomy_ceiling=float(otto.get("autonomy_ceiling", 0.50)),
            interaction_mode=InteractionMode(otto.get("interaction_mode", "collaborative")),
        )

    @property
    def inference_rules(self) -> dict[str, Any]:
        return self._inference_rules

    @property
    def confidence_rules(self) -> dict[str, Any]:
        return self._confidence_rules


class InferenceService:
    """Orchestrates the full inference pipeline.

    Pipeline: signals → drives → profile match → confidence → BMY response.
    """

    def __init__(self, engine: ProfileMatchingEngine) -> None:
        self._engine = engine

    def infer_drives(self, request: InferDrivesRequest) -> InferDrivesResponse:
        """Extract DECF drives from behavioral signals.

        Uses structured signal tables from drive-signals.yaml.
        Falls back to heuristics for open-ended text.
        """
        signals = request.signals
        adjustments: dict[str, Any] = {}

        # Start with neutral midpoint
        d, e, c, f = 5.0, 5.0, 5.0, 5.0
        signal_count = 0

        # --- Q1: Goal statement (open-ended text analysis) ---
        if signals.goal_statement:
            goal_adj = self._analyze_goal_statement(signals.goal_statement)
            d += goal_adj.get("dominance", 0)
            e += goal_adj.get("extraversion", 0)
            c += goal_adj.get("patience", 0)
            f += goal_adj.get("formality", 0)
            adjustments["goal_statement"] = goal_adj
            signal_count += 1

        # --- Q2: Autonomy preference (structured card) ---
        if signals.autonomy_preference:
            auto_adj = self._process_autonomy_signal(signals.autonomy_preference)
            f = auto_adj.get("formality", f)
            adjustments["autonomy_preference"] = auto_adj
            signal_count += 1

        # --- Q3: Report style (structured card) ---
        if signals.report_style:
            report_adj = self._process_report_style(signals.report_style)
            d += report_adj.get("dominance_adjust", 0)
            e += report_adj.get("extraversion_adjust", 0)
            c += report_adj.get("patience_adjust", 0)
            f += report_adj.get("formality_adjust", 0)
            adjustments["report_style"] = report_adj
            signal_count += 1

        # --- Q4: Team size (structured card) ---
        if signals.team_size:
            team_adj = self._process_team_size(signals.team_size)
            # Apply team size drive adjustments (scale_factor maps to extraversion)
            e += team_adj.get("extraversion_adjust", 0)
            d += team_adj.get("dominance_adjust", 0)
            adjustments["team_size"] = team_adj
            signal_count += 1

        # --- Career signals (LinkedIn/resume enrichment) ---
        if signals.job_title:
            career_adj = self._process_career_signals(signals.job_title, signals.tenure_years)
            d += career_adj.get("dominance_adjust", 0)
            e += career_adj.get("extraversion_adjust", 0)
            # Apply patience_hint from tenure patterns
            if "patience_adjust" in career_adj:
                c += career_adj["patience_adjust"]
            adjustments["career"] = career_adj
            signal_count += 1

        # Clamp drives to valid 1-10 range
        drives = DECFDrives(
            dominance=max(1.0, min(10.0, round(d, 1))),
            extraversion=max(1.0, min(10.0, round(e, 1))),
            patience=max(1.0, min(10.0, round(c, 1))),
            formality=max(1.0, min(10.0, round(f, 1))),
        )

        return InferDrivesResponse(
            drives=drives,
            signal_sources=list(signals.signal_sources),
            signal_count=signal_count,
            raw_adjustments=adjustments,
        )

    def match_profile(self, request: MatchProfileRequest) -> MatchProfileResponse:
        """Match DECF drives to the closest canonical profile."""
        match, candidates = self._engine.match(request.drives)

        # Compute confidence based on distance + signal count
        # (Signal count not available here — use default conversation_only base)
        confidence = self._compute_confidence(
            match_distance=match.distance,
            signal_sources=[SignalSource.CONVERSATION],
            signal_count=1,
        )
        match.confidence = confidence

        return MatchProfileResponse(match=match, top_candidates=candidates)

    def get_bmy_profile(self, request: BMYRequest) -> BMYResponse:
        """Full Build My Workspace flow: signals → drives → profile → config.

        Single-call endpoint for the Workspace Forge onboarding.
        """
        # Step 1: Infer drives from signals
        drive_response = self.infer_drives(InferDrivesRequest(signals=request.signals))

        # Step 2: Match to closest profile
        match, candidates = self._engine.match(drive_response.drives)

        # Step 3: Extract career confidence bonus if present
        career_confidence_bonus = 0.0
        career_adj = drive_response.raw_adjustments.get("career", {})
        if career_adj:
            career_confidence_bonus = career_adj.get("confidence_bonus", 0.0)

        # Step 4: Compute confidence with full signal context
        confidence = self._compute_confidence(
            match_distance=match.distance,
            signal_sources=drive_response.signal_sources,
            signal_count=drive_response.signal_count,
            career_confidence_bonus=career_confidence_bonus,
        )
        match.confidence = confidence

        # Step 5: Build confidence breakdown
        confidence_breakdown = self._build_confidence_breakdown(
            signal_sources=drive_response.signal_sources,
            signal_count=drive_response.signal_count,
            match_distance=match.distance,
            career_confidence_bonus=career_confidence_bonus,
        )

        # Step 6: Generate explanation narrative
        explanation = self._generate_explanation(match, drive_response)

        # Step 7: Determine enrichment suggestions
        enrichment_suggestions = self._suggest_enrichment(confidence, drive_response.signal_sources)

        # Step 8: Build provenance data
        provenance = ProvenanceData(
            all_distances=self._compute_all_distances(
                drive_response.drives,
                match_id=match.profile_id,
                runner_up_id=match.runner_up_id,
            ),
            drive_evidence=self._build_drive_evidence(
                drive_response.drives,
                drive_response.raw_adjustments,
            ),
            behavioral_tensions=self._detect_behavioral_tensions(drive_response.drives),
            raw_adjustments=drive_response.raw_adjustments,
        )

        return BMYResponse(
            drives=drive_response.drives,
            signal_count=drive_response.signal_count,
            profile=match,
            top_candidates=candidates,
            workspace_config=match.workspace_config,
            otto_config=match.otto_config,
            confidence=confidence,
            confidence_breakdown=confidence_breakdown,
            explanation=explanation,
            provenance=provenance,
            enrichment_suggestions=enrichment_suggestions,
        )

    # --- Signal Processing (Structured Tables) ---

    def _analyze_goal_statement(self, text: str) -> dict[str, float]:
        """Extract drive signals from open-ended goal statement.

        Uses keyword matching from drive-signals.yaml.
        In production, this would be augmented with LLM analysis.
        """
        rules = self._engine.inference_rules
        goal_signals = rules.get("goal_signals", {})
        text_lower = text.lower()
        adjustments: dict[str, float] = {}

        # Dominance signals
        high_d = goal_signals.get("high_dominance", {})
        low_d = goal_signals.get("low_dominance", {})
        high_d_keywords = high_d.get("keywords", [])
        low_d_keywords = low_d.get("keywords", [])
        high_d_phrases = high_d.get("phrases", [])
        low_d_phrases = low_d.get("phrases", [])

        d_score = 0.0
        for kw in high_d_keywords:
            if kw in text_lower:
                d_score += 0.5
        for phrase in high_d_phrases:
            if phrase in text_lower:
                d_score += 1.0
        for kw in low_d_keywords:
            if kw in text_lower:
                d_score -= 0.5
        for phrase in low_d_phrases:
            if phrase in text_lower:
                d_score -= 1.0

        weight = high_d.get("weight", 0.7)
        adjustments["dominance"] = round(d_score * weight, 2)

        # Patience signals
        low_c = goal_signals.get("low_patience", {})
        high_c = goal_signals.get("high_patience", {})
        c_score = 0.0
        for kw in low_c.get("keywords", []):
            if kw in text_lower:
                c_score -= 0.5
        for phrase in low_c.get("phrases", []):
            if phrase in text_lower:
                c_score -= 1.0
        for kw in high_c.get("keywords", []):
            if kw in text_lower:
                c_score += 0.5
        for phrase in high_c.get("phrases", []):
            if phrase in text_lower:
                c_score += 1.0

        c_weight = low_c.get("weight", 0.6)
        adjustments["patience"] = round(c_score * c_weight, 2)

        # Extraversion signals (language style)
        lang_signals = rules.get("language_style_signals", {})
        e_score = 0.0

        # Simple heuristic: check for "we" vs "I" language
        we_count = len(re.findall(r"\bwe\b", text_lower))
        i_count = len(re.findall(r"\bi\b", text_lower))
        if we_count > i_count:
            e_score += 1.5
        elif i_count > we_count:
            e_score -= 1.0

        # Check for enthusiasm markers
        if "!" in text:
            e_score += 0.5

        # Check for team/people references
        people_words = ["team", "people", "together", "collaborate", "meetings", "alignment"]
        task_words = ["system", "data", "analysis", "research", "building", "code"]
        people_count = sum(1 for w in people_words if w in text_lower)
        task_count = sum(1 for w in task_words if w in text_lower)
        if people_count > task_count:
            e_score += 1.0
        elif task_count > people_count:
            e_score -= 0.5

        e_weight = lang_signals.get("high_extraversion", {}).get("weight", 0.5)
        adjustments["extraversion"] = round(e_score * e_weight, 2)

        return adjustments

    def _process_autonomy_signal(self, autonomy_pref: str) -> dict[str, Any]:
        """Process Q2 autonomy preference from tappable card selection."""
        rules = self._engine.inference_rules
        auto_signals = rules.get("autonomy_signals", {})
        signal = _fuzzy_match_signal(autonomy_pref, auto_signals)

        return {
            "formality": signal.get("formality", 5),
            "interaction_mode": signal.get("interaction_mode", "collaborative"),
            "autonomy_ceiling": signal.get("autonomy_ceiling", 0.55),
        }

    def _process_report_style(self, report_style: str) -> dict[str, float]:
        """Process Q3 report style preference."""
        rules = self._engine.inference_rules
        style_signals = rules.get("report_style_signals", {})
        signal = _fuzzy_match_signal(report_style, style_signals)

        return {
            "meta_archetype": signal.get("meta_archetype", "driver"),
            "dominance_adjust": signal.get("dominance_adjust", 0),
            "extraversion_adjust": signal.get("extraversion_adjust", 0),
            "patience_adjust": signal.get("patience_adjust", 0),
            "formality_adjust": signal.get("formality_adjust", 0),
        }

    def _process_team_size(self, team_size: str) -> dict[str, Any]:
        """Process Q4 team size signal.

        Maps team scale to extraversion and dominance adjustments:
        - Solo: lower E (independent), slight D boost (self-directed)
        - Pod (2-5): neutral
        - Squad (5-20): moderate E boost (coordination needed)
        - Department (20+): high E boost, moderate D boost (leadership + social)
        """
        rules = self._engine.inference_rules
        team_signals = rules.get("team_size_signals", {})
        signal = _fuzzy_match_signal(team_size, team_signals)

        tier = signal.get("tier", "solo")
        scale_factor = signal.get("scale_factor", 1)

        # Map scale_factor to drive adjustments
        # scale_factor: 1=solo, 2=pod, 3=squad, 4=department
        extraversion_adjust = 0.0
        dominance_adjust = 0.0
        if scale_factor <= 1:
            # Solo: independent worker
            extraversion_adjust = -0.5
            dominance_adjust = 0.5
        elif scale_factor == 3:
            # Squad: moderate coordination
            extraversion_adjust = 0.5
        elif scale_factor >= 4:
            # Department: high social + leadership demands
            extraversion_adjust = 1.0
            dominance_adjust = 0.5

        return {
            "tier": tier,
            "scale_factor": scale_factor,
            "extraversion_adjust": extraversion_adjust,
            "dominance_adjust": dominance_adjust,
        }

    def _process_career_signals(
        self, job_title: str | None, tenure_years: float | None
    ) -> dict[str, float]:
        """Process career signals from LinkedIn/resume data."""
        rules = self._engine.inference_rules
        career = rules.get("career_signals", {})
        job_titles = career.get("job_titles", {})
        adjustments: dict[str, float] = {
            "dominance_adjust": 0,
            "extraversion_adjust": 0,
            "confidence_bonus": 0.0,
        }

        if job_title:
            title_lower = job_title.lower()
            if any(t in title_lower for t in ["ceo", "founder", "cto", "president"]):
                match = job_titles.get("ceo_founder_cto", {})
            elif any(t in title_lower for t in ["vp", "vice president", "director"]):
                match = job_titles.get("vp_director", {})
            elif any(t in title_lower for t in ["manager", "lead", "head"]):
                match = job_titles.get("manager_lead", {})
            elif any(t in title_lower for t in ["engineer", "analyst", "developer"]):
                match = job_titles.get("engineer_analyst", {})
            else:
                match = job_titles.get("specialist_coordinator", {})

            # Adjust toward the title's canonical drive values
            target_d = match.get("dominance", 5)
            target_e = match.get("extraversion", 5)
            adjustments["dominance_adjust"] = (target_d - 5) * 0.3  # Moderate influence
            adjustments["extraversion_adjust"] = (target_e - 5) * 0.3
            adjustments["confidence_bonus"] = match.get("confidence_bonus", 0.0)

        if tenure_years is not None:
            tenure_patterns = career.get("tenure_patterns", {})
            if tenure_years < 2:
                patience_hint = tenure_patterns.get("short_tenure_avg", {}).get("patience", 3)
                # Apply as adjustment from neutral midpoint (5)
                adjustments["patience_adjust"] = (patience_hint - 5) * 0.3
            elif tenure_years > 4:
                patience_hint = tenure_patterns.get("long_tenure_avg", {}).get("patience", 7)
                adjustments["patience_adjust"] = (patience_hint - 5) * 0.3

        return adjustments

    # --- Confidence Scoring ---

    def _load_confidence_config(self) -> tuple[dict[str, Any], dict[str, Any]]:
        """Load shared confidence rules. Returns (signal_conf, dist_penalty)."""
        rules = self._engine.confidence_rules
        return rules.get("signal_confidence", {}), rules.get("distance_penalty", {})

    def _compute_confidence(
        self,
        match_distance: float,
        signal_sources: list[SignalSource],
        signal_count: int,
        career_confidence_bonus: float = 0.0,
    ) -> float:
        """Compute overall confidence score.

        Uses confidence-rules.yaml for calculation:
        - Base confidence from signal sources (additive)
        - Distance penalty if match is far from canonical
        - Career confidence bonus from job title match
        - Additional question bonus
        """
        signal_conf, dist_penalty_rules = self._load_confidence_config()

        # Base: conversation only
        base = signal_conf.get("conversation_only", {}).get("base", 0.55)

        # Additional questions beyond Q1 add 0.05 each
        extra_qs = max(0, signal_count - 1)
        per_q_bonus = signal_conf.get("conversation_only", {}).get("per_additional_question", 0.05)
        max_conv = signal_conf.get("conversation_only", {}).get("max", 0.70)
        conversation_confidence = min(base + (extra_qs * per_q_bonus), max_conv)

        # Additional source bonuses
        total = conversation_confidence
        if SignalSource.LINKEDIN in signal_sources:
            linkedin_bonus = signal_conf.get("linkedin_import", {}).get("base", 0.20)
            linkedin_max = signal_conf.get("linkedin_import", {}).get("max_with_conversation", 0.90)
            total = min(total + linkedin_bonus, linkedin_max)
        if SignalSource.RESUME in signal_sources:
            resume_bonus = signal_conf.get("resume_upload", {}).get("base", 0.15)
            resume_max = signal_conf.get("resume_upload", {}).get("max_with_conversation", 0.85)
            total = min(total + resume_bonus, resume_max)

        # Career confidence bonus (from job title match)
        total += career_confidence_bonus

        # Distance penalty
        threshold = dist_penalty_rules.get("threshold", 4.0)
        if match_distance > threshold:
            penalty_per_unit = dist_penalty_rules.get("penalty_per_unit", 0.05)
            max_penalty = dist_penalty_rules.get("max_penalty", 0.20)
            penalty = min((match_distance - threshold) * penalty_per_unit, max_penalty)
            total -= penalty

        # User override is always high confidence
        if SignalSource.USER_OVERRIDE in signal_sources:
            override_rules = self._engine.confidence_rules.get("override_impact", {})
            total = override_rules.get("user_override_to_different_profile", {}).get(
                "new_confidence", 0.90
            )

        return round(max(0.0, min(1.0, total)), 2)

    def _build_confidence_breakdown(
        self,
        signal_sources: list[SignalSource],
        signal_count: int,
        match_distance: float,
        career_confidence_bonus: float = 0.0,
    ) -> dict[str, float]:
        """Build a transparent breakdown of confidence contributions."""
        signal_conf, dist_penalty_rules = self._load_confidence_config()

        breakdown: dict[str, float] = {}

        # Conversation base
        conv = signal_conf.get("conversation_only", {})
        base = conv.get("base", 0.55)
        extra_qs = max(0, signal_count - 1)
        per_q = conv.get("per_additional_question", 0.05)
        breakdown["conversation_base"] = base
        if extra_qs > 0:
            breakdown["additional_questions"] = round(extra_qs * per_q, 2)

        # Source bonuses
        if SignalSource.LINKEDIN in signal_sources:
            breakdown["linkedin"] = signal_conf.get("linkedin_import", {}).get("base", 0.20)
        if SignalSource.RESUME in signal_sources:
            breakdown["resume"] = signal_conf.get("resume_upload", {}).get("base", 0.15)

        # Career confidence bonus
        if career_confidence_bonus > 0:
            breakdown["career_title"] = round(career_confidence_bonus, 2)

        # Distance penalty
        threshold = dist_penalty_rules.get("threshold", 4.0)
        if match_distance > threshold:
            penalty_per_unit = dist_penalty_rules.get("penalty_per_unit", 0.05)
            max_penalty = dist_penalty_rules.get("max_penalty", 0.20)
            penalty = min((match_distance - threshold) * penalty_per_unit, max_penalty)
            breakdown["distance_penalty"] = round(-penalty, 2)

        return breakdown

    # --- Narrative Generation ---

    def _generate_explanation(
        self, match: ProfileMatch, drive_response: InferDrivesResponse
    ) -> str:
        """Generate a human-readable explanation of the profile match.

        This is what Otto says: "I think you're a Maverick because..."
        """
        profile_data = self._engine.get_profile_data(match.profile_id)
        bio = profile_data.get("bio", "") if profile_data else ""
        strengths = profile_data.get("strengths", []) if profile_data else []

        # Build the narrative
        parts = [
            f"Otto thinks you're a **{match.profile_name}** — {bio}",
        ]

        # Explain the drive reasoning
        drives = drive_response.drives
        d, e, c, f = drives.dominance, drives.extraversion, drives.patience, drives.formality
        drive_insights = []
        if d >= 7:
            drive_insights.append("high drive for results and action")
        elif d <= 3:
            drive_insights.append("preference for supporting and assisting over directing")
        if e >= 7:
            drive_insights.append("strong social and collaborative orientation")
        elif e <= 3:
            drive_insights.append("preference for independent, focused work")
        if c >= 7:
            drive_insights.append("high patience and methodical approach")
        elif c <= 3:
            drive_insights.append("urgency-driven and fast-paced")
        if f >= 7:
            drive_insights.append("strong preference for structure and process")
        elif f <= 3:
            drive_insights.append("comfort with ambiguity and informal approaches")

        if drive_insights:
            parts.append("Based on your answers, you show " + ", ".join(drive_insights) + ".")

        # Top strengths
        if strengths:
            top_strengths = strengths[:2]
            parts.append(f"Key strengths: {top_strengths[0].lower()}")
            if len(top_strengths) > 1:
                parts[-1] += f", and {top_strengths[1].lower()}"
            parts[-1] += "."

        # Runner-up context
        if match.runner_up_id:
            runner_data = self._engine.get_profile_data(match.runner_up_id)
            runner_name = (
                runner_data.get("name", match.runner_up_id.title())
                if runner_data
                else match.runner_up_id.title()
            )
            parts.append(
                f"You also have similarities to the **{runner_name}** profile"
                f" (distance: {match.runner_up_distance})."
            )

        # Confidence caveat
        if match.confidence < 0.65:
            parts.append(
                "MAGS is still learning about you — answering more questions "
                "or connecting LinkedIn will sharpen this match."
            )

        return " ".join(parts)

    # --- Provenance Methods ---

    def _build_drive_evidence(
        self,
        drives: DECFDrives,
        raw_adjustments: dict[str, Any],
    ) -> list[DriveEvidence]:
        """Build per-drive signal attribution for provenance transparency."""
        drive_names = ["dominance", "extraversion", "patience", "formality"]
        drive_values = {
            "dominance": drives.dominance,
            "extraversion": drives.extraversion,
            "patience": drives.patience,
            "formality": drives.formality,
        }

        evidence_list = []
        for drive in drive_names:
            signals = []

            # Goal statement contributions
            goal_adj = raw_adjustments.get("goal_statement", {})
            if drive in goal_adj and goal_adj[drive] != 0:
                direction = "+" if goal_adj[drive] > 0 else ""
                signals.append(
                    {
                        "source": "goal_statement",
                        "contribution": goal_adj[drive],
                        "reason": f"Language analysis of your goals ({direction}{goal_adj[drive]})",
                    }
                )

            # Autonomy preference
            auto_adj = raw_adjustments.get("autonomy_preference", {})
            if drive == "formality" and "formality" in auto_adj:
                signals.append(
                    {
                        "source": "autonomy_preference",
                        "contribution": auto_adj["formality"] - 5,  # delta from neutral
                        "reason": f"Autonomy selection set formality to {auto_adj['formality']}",
                    }
                )

            # Report style
            report_adj = raw_adjustments.get("report_style", {})
            adj_key = f"{drive}_adjust"
            if adj_key in report_adj and report_adj[adj_key] != 0:
                signals.append(
                    {
                        "source": "report_style",
                        "contribution": report_adj[adj_key],
                        "reason": f"Report style preference ({report_adj.get('meta_archetype', 'unknown')} pattern)",
                    }
                )

            # Team size
            team_adj = raw_adjustments.get("team_size", {})
            if adj_key in team_adj and team_adj[adj_key] != 0:
                signals.append(
                    {
                        "source": "team_size",
                        "contribution": team_adj[adj_key],
                        "reason": f"Team scale: {team_adj.get('tier', 'unknown')}",
                    }
                )

            # Career signals
            career_adj = raw_adjustments.get("career", {})
            if adj_key in career_adj and career_adj[adj_key] != 0:
                signals.append(
                    {
                        "source": "career",
                        "contribution": career_adj[adj_key],
                        "reason": "Career title and tenure pattern",
                    }
                )

            # Baseline signal (always present if no other signals)
            if not signals:
                signals.append(
                    {
                        "source": "baseline",
                        "contribution": 0,
                        "reason": "No direct signal — neutral midpoint (5.0)",
                    }
                )

            evidence_list.append(
                DriveEvidence(
                    drive=drive,
                    value=drive_values[drive],
                    signals=signals,
                )
            )

        return evidence_list

    def _detect_behavioral_tensions(self, drives: DECFDrives) -> list[BehavioralTension]:
        """Detect conflicts where drives that typically correlate are in opposition."""
        tensions = []

        # Low patience + high formality = "wants speed but demands process"
        if drives.patience <= 3 and drives.formality >= 7:
            tensions.append(
                BehavioralTension(
                    drive_a="patience",
                    value_a=drives.patience,
                    drive_b="formality",
                    value_b=drives.formality,
                    description=f"Your patience is {drives.patience} (move fast) but formality is {drives.formality} (want structure). Fast movers who demand heavy process often hit friction with themselves. Which one wins on a Tuesday?",
                )
            )

        # High dominance + high patience = "wants control but moves slowly"
        if drives.dominance >= 7 and drives.patience >= 7:
            tensions.append(
                BehavioralTension(
                    drive_a="dominance",
                    value_a=drives.dominance,
                    drive_b="patience",
                    value_b=drives.patience,
                    description=f"Your dominance is {drives.dominance} (drive for results) but patience is {drives.patience} (methodical pace). You want to be in charge but you don't rush. That's rare — and it means your bottleneck is usually other people's speed, not your own.",
                )
            )

        # High extraversion + high formality
        if drives.extraversion >= 7 and drives.formality >= 7:
            tensions.append(
                BehavioralTension(
                    drive_a="extraversion",
                    value_a=drives.extraversion,
                    drive_b="formality",
                    value_b=drives.formality,
                    description=f"Your extraversion is {drives.extraversion} (collaborative) but formality is {drives.formality} (structured). You want to work with people but you also want things done right. You're the one who enjoys the brainstorm but writes the follow-up email with action items.",
                )
            )

        # Low dominance + low patience
        if drives.dominance <= 3 and drives.patience <= 3:
            tensions.append(
                BehavioralTension(
                    drive_a="dominance",
                    value_a=drives.dominance,
                    drive_b="patience",
                    value_b=drives.patience,
                    description=f"Your dominance is {drives.dominance} (supportive) but patience is {drives.patience} (urgent). You don't want to lead the charge but you want the charge to happen now. That tension usually means you're the one who sees what needs doing before anyone else — and gets frustrated waiting for someone to call the play.",
                )
            )

        return tensions

    def _compute_all_distances(
        self,
        drives: DECFDrives,
        match_id: str,
        runner_up_id: str | None,
    ) -> list[ProfileDistance]:
        """Compute distances to all 17 profiles with rejection reasons for non-matches."""
        raw_distances = self._engine.compute_distances(drives)
        inferred_vec = drives.as_vector()
        result = []

        for profile_id, dist in raw_distances:
            profile_data = self._engine.get_profile_data(profile_id)
            canonical_vec = self._engine._canonical_vectors.get(profile_id, [5, 5, 5, 5])
            is_match = profile_id == match_id
            is_runner = profile_id == runner_up_id

            rejection_reason = None
            if not is_match and not is_runner:
                drive_names = ["dominance", "extraversion", "patience", "formality"]
                deltas = [
                    (abs(a - b), name, a, b)
                    for (a, b, name) in zip(inferred_vec, canonical_vec, drive_names, strict=True)
                ]
                deltas.sort(reverse=True)
                biggest = deltas[0]
                rejection_reason = (
                    f"{biggest[1].title()} divergence: "
                    f"you're {biggest[2]:.1f}, {profile_data.get('name', profile_id)} "
                    f"canonical is {biggest[3]:.0f} (gap: {biggest[0]:.1f})"
                )

            meta = self._engine._resolve_meta_archetype(profile_id, drives)

            result.append(
                ProfileDistance(
                    profile_id=profile_id,
                    profile_name=profile_data.get("name", profile_id.title())
                    if profile_data
                    else profile_id.title(),
                    distance=round(dist, 4),
                    meta_archetype=meta,
                    is_match=is_match,
                    is_runner_up=is_runner,
                    rejection_reason=rejection_reason,
                )
            )

        return result

    def _suggest_enrichment(
        self, confidence: float, signal_sources: list[SignalSource]
    ) -> list[str]:
        """Suggest ways to improve confidence."""
        rules = self._engine.confidence_rules
        thresholds = rules.get("thresholds", {})
        enrichment_threshold = thresholds.get("enrichment_prompt", 0.75)

        suggestions: list[str] = []
        if confidence < enrichment_threshold:
            if SignalSource.LINKEDIN not in signal_sources:
                suggestions.append("Connect your LinkedIn profile to boost confidence by ~20%")
            if SignalSource.RESUME not in signal_sources:
                suggestions.append(
                    "Upload your resume for additional signal data (+15% confidence)"
                )
            suggestions.append("Answer additional questions to refine your drive scores")

        return suggestions
