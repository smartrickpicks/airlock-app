"""Calibration Engine — Adaptive question selection + drive updates.

Processes answers from Otto's Calibration Journey, updates DECF drives,
computes confidence, selects micro-insights, and picks the next question
using hybrid routing (drive-gap targeting early, archetype confirmation late).

At BMY threshold (0.75), runs full profile matching via ProfileMatchingEngine.
"""

from __future__ import annotations

import logging
import random
import re
from pathlib import Path
from typing import Any

import yaml

from src.schemas.inference import DECFDrives, MetaArchetype
from src.services.inference import ProfileMatchingEngine

logger = logging.getLogger(__name__)

# --- Constants ---

BASE_CONFIDENCE = 0.10
PER_QUESTION_BONUS = 0.15
ARCHETYPE_CONFIRM_BONUS = 0.05
DRIVE_MIDPOINT = 5.5  # Neutral starting point for all drives
DRIVE_MIN = 1.0
DRIVE_MAX = 10.0

UNLOCK_THRESHOLDS = [0.55, 0.65, 0.75, 0.85]

# Language pattern keyword maps for conversational question analysis
LANGUAGE_PATTERNS: dict[str, list[str]] = {
    "speed_frustration": [
        "slow",
        "waiting",
        "bottleneck",
        "delay",
        "stuck",
        "blocked",
        "too long",
        "pace",
        "wasting time",
        "hurry",
    ],
    "disorder_frustration": [
        "disorganized",
        "messy",
        "no process",
        "inconsistent",
        "chaos",
        "sloppy",
        "unstructured",
        "random",
        "no system",
        "unclear",
    ],
    "people_frustration": [
        "people",
        "coworker",
        "manager",
        "team",
        "communicate",
        "politics",
        "drama",
        "conflict",
        "micromanage",
        "trust",
    ],
    "we_language": [
        "we",
        "us",
        "our",
        "team",
        "together",
        "collaborate",
        "group",
        "everyone",
        "collectively",
    ],
    "leadership_language": [
        "led",
        "built",
        "drove",
        "created",
        "launched",
        "founded",
        "owned",
        "spearheaded",
        "managed",
        "directed",
    ],
    "speed_language": [
        "fast",
        "quick",
        "ship",
        "move",
        "sprint",
        "hustle",
        "rapid",
        "accelerate",
        "velocity",
    ],
    "structured_explanation": [
        "first",
        "second",
        "third",
        "step",
        "framework",
        "process",
        "outline",
        "structure",
        "organize",
        "sequence",
        "list",
    ],
    "storytelling_explanation": [
        "story",
        "example",
        "imagine",
        "picture",
        "like when",
        "analogy",
        "metaphor",
        "feel",
        "remember",
    ],
    "action_explanation": [
        "show",
        "demo",
        "just do",
        "try it",
        "hands-on",
        "build",
        "prototype",
        "let me show",
    ],
    "people_skill": [
        "people",
        "listen",
        "empathy",
        "connect",
        "mediate",
        "coach",
        "mentor",
        "communicate",
        "relationships",
    ],
    "systems_skill": [
        "systems",
        "organize",
        "spreadsheet",
        "database",
        "automate",
        "process",
        "optimize",
        "data",
        "efficiency",
    ],
    "leadership_skill": [
        "lead",
        "rally",
        "vision",
        "inspire",
        "strategy",
        "decide",
        "delegate",
        "build teams",
    ],
}


def _clamp_drive(value: float) -> float:
    """Clamp a drive value to [1.0, 10.0]."""
    return max(DRIVE_MIN, min(DRIVE_MAX, value))


class CalibrationEngine:
    """Adaptive calibration engine for Otto's question-driven DECF inference.

    Loads question-pool.yaml, processes answers (card taps + conversational),
    updates drives, computes confidence, and selects the next best question.
    """

    def __init__(self, persona_path: Path | None = None) -> None:
        self._persona_path = persona_path or Path("")
        self._questions: dict[str, Any] = {}
        self._micro_insights: dict[str, list[str]] = {}
        self._unlock_messages: dict[str, Any] = {}
        self._profile_engine: ProfileMatchingEngine | None = None
        self._loaded = False

    def load(self) -> None:
        """Load question-pool.yaml and initialize ProfileMatchingEngine."""
        pool_path = self._persona_path / "inference" / "question-pool.yaml"
        if not pool_path.exists():
            msg = f"Question pool not found: {pool_path}"
            raise FileNotFoundError(msg)

        with pool_path.open() as f:
            data = yaml.safe_load(f)

        self._questions = data.get("questions", {})
        self._micro_insights = data.get("micro_insights", {})
        self._unlock_messages = data.get("unlock_messages", {})

        # Initialize profile matching engine
        self._profile_engine = ProfileMatchingEngine(persona_path=self._persona_path)
        self._profile_engine.load()

        self._loaded = True
        logger.info(
            "CalibrationEngine loaded: %d questions, %d insight categories",
            len(self._questions),
            len(self._micro_insights),
        )

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def question_count(self) -> int:
        return len(self._questions)

    def get_question(self, question_id: str) -> dict[str, Any] | None:
        """Get a question by ID."""
        return self._questions.get(question_id)

    def new_session(self) -> dict[str, Any]:
        """Return a fresh calibration state dict."""
        return {
            "drives": {
                "dominance": DRIVE_MIDPOINT,
                "extraversion": DRIVE_MIDPOINT,
                "patience": DRIVE_MIDPOINT,
                "formality": DRIVE_MIDPOINT,
            },
            "answered": [],  # List of question_ids answered
            "signal_count": 0,
            "drives_touched": set(),  # Which drives have received signal
            "archetype_hypothesis": None,  # Current meta-archetype guess
            "archetype_confirmations": 0,
            "confidence": BASE_CONFIDENCE,
            "unlocks_emitted": [],  # Thresholds already emitted
        }

    def apply_answer(
        self,
        drives: dict[str, float],
        question_id: str,
        selected_option_id: str | None = None,
        free_text: str | None = None,
    ) -> dict[str, float]:
        """Apply drive adjustments from an answer, return updated drives.

        For card_tap questions: apply the selected option's adjustments.
        For conversational questions: analyze free_text via language patterns.
        """
        question = self._questions.get(question_id)
        if not question:
            logger.warning("Unknown question_id: %s", question_id)
            return drives

        new_drives = dict(drives)
        fmt = question.get("format", "card_tap")

        if fmt == "card_tap" and selected_option_id:
            # Find the selected option and apply its adjustments
            for option in question.get("options", []):
                if option["id"] == selected_option_id:
                    for drive_name, adj in option.get("adjustments", {}).items():
                        new_drives[drive_name] = _clamp_drive(
                            new_drives.get(drive_name, DRIVE_MIDPOINT) + adj
                        )
                    break

        if fmt == "conversational" and free_text:
            adjustments = self._analyze_free_text(question, free_text)
            for drive_name, adj in adjustments.items():
                new_drives[drive_name] = _clamp_drive(
                    new_drives.get(drive_name, DRIVE_MIDPOINT) + adj
                )

        # Also handle card_tap with custom text
        if fmt == "card_tap" and free_text and question.get("allows_custom_text"):
            adjustments = self._analyze_free_text(question, free_text)
            for drive_name, adj in adjustments.items():
                new_drives[drive_name] = _clamp_drive(
                    new_drives.get(drive_name, DRIVE_MIDPOINT) + adj
                )

        return new_drives

    def _analyze_free_text(self, question: dict[str, Any], text: str) -> dict[str, float]:
        """Analyze free text using language patterns defined on the question."""
        adjustments: dict[str, float] = {}
        analysis_rules = question.get("language_analysis", [])

        for rule in analysis_rules:
            pattern_name = rule.get("pattern", "")
            if self._matches_pattern(pattern_name, text):
                for drive_name, adj in rule.get("adjustments", {}).items():
                    adjustments[drive_name] = adjustments.get(drive_name, 0) + adj

        # Apply language style analysis on top
        self._apply_language_style(text, adjustments)
        return adjustments

    def _matches_pattern(self, pattern_name: str, text: str) -> bool:
        """Check if text matches a named language pattern via keyword detection."""
        keywords = LANGUAGE_PATTERNS.get(pattern_name, [])
        if not keywords:
            return False
        text_lower = text.lower()
        return any(kw in text_lower for kw in keywords)

    def _apply_language_style(self, text: str, adjustments: dict[str, float]) -> None:
        """Detect we/I ratio and enthusiasm markers, apply small adjustments in-place."""
        text_lower = text.lower()
        words = re.findall(r"\b\w+\b", text_lower)

        if words:
            we_count = sum(1 for w in words if w in ("we", "us", "our"))
            i_count = sum(1 for w in words if w in ("i", "me", "my"))

            if we_count > i_count + 1:
                adjustments["extraversion"] = adjustments.get("extraversion", 0) + 0.5
            elif i_count > we_count + 2:
                adjustments["dominance"] = adjustments.get("dominance", 0) + 0.3

        # Enthusiasm markers (exclamation marks, caps)
        exclaim_count = text.count("!")
        if exclaim_count >= 2:
            adjustments["extraversion"] = adjustments.get("extraversion", 0) + 0.3

    def compute_confidence(self, state: dict[str, Any]) -> float:
        """Compute confidence from signal count, drive coverage, and archetype confirmation.

        Formula: BASE_CONFIDENCE + (num_additional_answers * PER_QUESTION_BONUS)
                 + archetype_confirm_bonus - coverage_penalty
        Capped at 1.0.
        """
        num_answered = len(state.get("answered", []))
        if num_answered == 0:
            return BASE_CONFIDENCE

        # Base + per-question bonus for each answer after the first
        confidence = BASE_CONFIDENCE + num_answered * PER_QUESTION_BONUS

        # Archetype confirmation bonus
        if state.get("archetype_confirmations", 0) > 0:
            confidence += ARCHETYPE_CONFIRM_BONUS

        # Coverage penalty: penalize if some drives haven't been measured
        # Only apply after 2+ answers (first answer can't cover everything)
        if num_answered >= 2:
            drives_touched = state.get("drives_touched", set())
            all_drives = {"dominance", "extraversion", "patience", "formality"}
            uncovered = all_drives - drives_touched
            if uncovered:
                coverage_penalty = len(uncovered) * 0.03
                confidence -= coverage_penalty

        return min(1.0, max(0.0, confidence))

    def process_answer(
        self,
        state: dict[str, Any],
        question_id: str,
        selected_option_id: str | None = None,
        free_text: str | None = None,
    ) -> dict[str, Any]:
        """Full answer processing: update drives, confidence, micro-insight, next question.

        Returns a result dict with: drives, confidence, micro_insight, unlock_events,
        archetype_hypothesis, profile_match (if threshold hit).
        """
        question = self._questions.get(question_id)
        if not question:
            return {"error": f"Unknown question: {question_id}"}

        old_confidence = state["confidence"]

        # 1. Apply drive adjustments
        old_drives = state["drives"]
        new_drives = self.apply_answer(old_drives, question_id, selected_option_id, free_text)
        state["drives"] = new_drives

        # 2. Track answered questions and signal metadata
        state["answered"].append(question_id)
        state["signal_count"] += 1

        # Track which drives were measured
        for drive in question.get("drives_measured", []):
            state["drives_touched"].add(drive)

        # 3. Compute drive adjustments for micro-insight selection
        adjustments: dict[str, float] = {}
        for k in ("dominance", "extraversion", "patience", "formality"):
            diff = new_drives[k] - old_drives[k]
            if abs(diff) > 0.01:
                adjustments[k] = diff

        # 4. Infer archetype hypothesis
        archetype = self._infer_archetype(new_drives)
        state["archetype_hypothesis"] = archetype

        # Check archetype confirmation
        if question.get("archetype_confirmation") and archetype:
            expected_option = question["archetype_confirmation"].get(archetype)
            if expected_option and expected_option == selected_option_id:
                state["archetype_confirmations"] += 1

        # 5. Compute new confidence
        new_confidence = self.compute_confidence(state)
        state["confidence"] = new_confidence

        # 6. Micro-insight
        micro_insight = self.select_micro_insight(adjustments)

        # 7. Unlock events
        unlock_events = self.check_unlock_thresholds(old_confidence, new_confidence)
        for evt in unlock_events:
            if evt["threshold"] not in state["unlocks_emitted"]:
                state["unlocks_emitted"].append(evt["threshold"])

        # 8. Profile match at BMY threshold
        profile_match = None
        if new_confidence >= 0.75:
            profile_match = self.get_profile_match(new_drives)

        return {
            "drives": new_drives,
            "confidence": new_confidence,
            "micro_insight": micro_insight,
            "unlock_events": unlock_events,
            "archetype_hypothesis": archetype,
            "profile_match": profile_match,
        }

    def _infer_archetype(self, drives: dict[str, float]) -> str | None:
        """Infer meta-archetype hypothesis from current drives.

        Rules:
        - D >= 6 and C <= 5 → driver
        - F >= 6 and C >= 5 → enforcer
        - E >= 6 → interpreter
        - Fallback: scoring-based
        """
        d = drives.get("dominance", DRIVE_MIDPOINT)
        e = drives.get("extraversion", DRIVE_MIDPOINT)
        c = drives.get("patience", DRIVE_MIDPOINT)
        f = drives.get("formality", DRIVE_MIDPOINT)

        if d >= 6 and c <= 5:
            return MetaArchetype.DRIVER
        if f >= 6 and c >= 5:
            return MetaArchetype.ENFORCER
        if e >= 6:
            return MetaArchetype.INTERPRETER

        # Fallback scoring
        scores = {
            MetaArchetype.DRIVER: d - c,
            MetaArchetype.ENFORCER: f + (c - 5) * 0.5,
            MetaArchetype.INTERPRETER: e,
        }
        best = max(scores, key=lambda k: scores[k])
        # Only return if there's meaningful signal
        if scores[best] > DRIVE_MIDPOINT:
            return best
        return None

    def select_next_question(self, state: dict[str, Any]) -> str | None:
        """Select the next best question via hybrid routing.

        Early (low confidence): target under-sampled drives (drive-gap).
        Late (high confidence): archetype confirmation questions.
        Always: respect priority, never repeat.
        """
        answered = set(state.get("answered", []))
        available = {qid: q for qid, q in self._questions.items() if qid not in answered}

        if not available:
            return None

        # If no answers yet, pick highest priority (goal_statement)
        if not answered:
            best = min(available, key=lambda qid: available[qid].get("priority", 99))
            return best

        drives = state["drives"]
        confidence = state["confidence"]
        archetype = state.get("archetype_hypothesis")
        drives_touched = state.get("drives_touched", set())

        scores: dict[str, float] = {}

        for qid, q in available.items():
            score = 0.0
            q_drives = q.get("drives_measured", [])

            # Drive-gap score: reward questions that measure under-sampled drives
            for drive in q_drives:
                if drive not in drives_touched:
                    score += 3.0  # Strong bonus for uncovered drives
                else:
                    # Reward drives close to midpoint (ambiguous, need more signal)
                    deviation = abs(drives.get(drive, DRIVE_MIDPOINT) - DRIVE_MIDPOINT)
                    score += max(0, 2.0 - deviation * 0.4)

            # Archetype affinity/confirmation (weighted more at higher confidence)
            if confidence >= 0.65 and archetype:
                affinity = q.get("archetype_affinity", {})
                if archetype in affinity:
                    score += affinity[archetype] * confidence * 2

                confirmation = q.get("archetype_confirmation", {})
                if archetype in confirmation:
                    score += confidence * 3

            # Priority tiebreaker (lower priority number = better)
            priority = q.get("priority", 5)
            score -= priority * 0.1

            scores[qid] = score

        if not scores:
            return None

        return max(scores, key=lambda k: scores[k])

    def select_micro_insight(self, adjustments: dict[str, float]) -> str:
        """Pick a micro-insight based on the strongest drive signal from an answer.

        Returns the insight string. Falls back to 'ambiguous' if no strong signal.
        """
        if not adjustments:
            return self._pick_insight("ambiguous")

        # Find strongest adjustment
        strongest_drive = max(adjustments, key=lambda k: abs(adjustments[k]))
        strongest_value = adjustments[strongest_drive]

        if abs(strongest_value) < 0.5:
            return self._pick_insight("ambiguous")

        direction = "high" if strongest_value > 0 else "low"
        key = f"{strongest_drive}_{direction}"
        return self._pick_insight(key)

    def _pick_insight(self, key: str) -> str:
        """Pick a random insight from the pool for the given key."""
        pool = self._micro_insights.get(key, [])
        if not pool:
            fallback = self._micro_insights.get("ambiguous", ["Processing..."])
            return random.choice(fallback)
        return random.choice(pool)

    def check_unlock_thresholds(
        self, old_confidence: float, new_confidence: float
    ) -> list[dict[str, Any]]:
        """Check which unlock thresholds were crossed and return unlock events.

        Only emits events for thresholds crossed in this transition
        (old < threshold <= new).
        """
        events: list[dict[str, Any]] = []
        for threshold in UNLOCK_THRESHOLDS:
            if old_confidence < threshold <= new_confidence:
                msg = self._unlock_messages.get(str(threshold), {})
                events.append(
                    {
                        "threshold": threshold,
                        "otto_says": msg.get("otto_says", ""),
                        "visual": msg.get("visual", ""),
                    }
                )
        return events

    def get_profile_match(self, drives: dict[str, float]) -> dict[str, Any] | None:
        """Run full profile matching via ProfileMatchingEngine.

        Returns a dict with profile_id, profile_name, distance, meta_archetype,
        and runner_up info.
        """
        if not self._profile_engine or not self._profile_engine.is_loaded:
            logger.warning("ProfileMatchingEngine not loaded — cannot match")
            return None

        decf = DECFDrives(
            dominance=drives.get("dominance", DRIVE_MIDPOINT),
            extraversion=drives.get("extraversion", DRIVE_MIDPOINT),
            patience=drives.get("patience", DRIVE_MIDPOINT),
            formality=drives.get("formality", DRIVE_MIDPOINT),
        )

        try:
            match, candidates = self._profile_engine.match(decf)
            return {
                "profile_id": match.profile_id,
                "profile_name": match.profile_name,
                "distance": match.distance,
                "meta_archetype": match.meta_archetype,
                "runner_up_id": match.runner_up_id,
                "runner_up_distance": match.runner_up_distance,
                "top_candidates": [
                    {"profile_id": c.profile_id, "distance": c.distance} for c in candidates
                ],
            }
        except Exception:
            logger.exception("Profile matching failed")
            return None
