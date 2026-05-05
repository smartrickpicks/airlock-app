"""FanCalibrationService — 5-question behavioral quiz engine.

Maps fans to one of the creator's 5 contextual personas using
Euclidean distance matching on DECF drives.
"""

import math
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.fan_calibration import FanCalibration
from src.models.orbit_persona import OrbitPersona

# ---------------------------------------------------------------------------
# Quiz questions — A/B format, each option adjusts DECF drives
# ---------------------------------------------------------------------------

QUIZ_QUESTIONS = [
    {
        "id": 1,
        "text": "When you find new content you love...",
        "a": {"label": "Share it immediately with everyone", "drives": {"E": 2, "D": 1}},
        "b": {"label": "Save it for yourself to enjoy later", "drives": {"C": 1, "F": 1}},
    },
    {
        "id": 2,
        "text": "In a creator's community, you're usually...",
        "a": {"label": "The one who starts conversations", "drives": {"E": 2, "D": 1}},
        "b": {"label": "Observing thoughtfully before engaging", "drives": {"F": 2, "C": 1}},
    },
    {
        "id": 3,
        "text": "You follow a creator because they...",
        "a": {"label": "Inspire you to take action", "drives": {"D": 2}},
        "b": {"label": "Help you understand things deeply", "drives": {"F": 2}},
    },
    {
        "id": 4,
        "text": "When a creator changes their style...",
        "a": {"label": "Love the evolution — keep it fresh", "drives": {"D": 1, "E": 1}},
        "b": {"label": "Prefer consistency — it's why you followed", "drives": {"C": 2}},
    },
    {
        "id": 5,
        "text": "Your dream creator interaction...",
        "a": {"label": "A collab or shoutout — let's create together", "drives": {"E": 2, "D": 1}},
        "b": {"label": "A deep conversation about their process", "drives": {"F": 1, "C": 1}},
    },
]

# Drive matching targets for the 5 default personas
DRIVE_TARGETS = {
    "venturer": {"D": 8, "E": 4, "C": 3, "F": 3},
    "persuader": {"D": 7, "E": 9, "C": 3, "F": 2},
    "guardian": {"D": 3, "E": 3, "C": 8, "F": 8},
    "analyzer": {"D": 4, "E": 2, "C": 6, "F": 9},
    "collaborator": {"D": 3, "E": 7, "C": 7, "F": 4},
}

NEUTRAL_DRIVES = {"D": 5, "E": 5, "C": 5, "F": 5}


def _euclidean_distance(drives: dict, target: dict) -> float:
    """Compute Euclidean distance between two DECF drive vectors."""
    return math.sqrt(sum((drives[k] - target[k]) ** 2 for k in "DECF"))


def _confidence_from_distance(distance: float) -> float:
    """Map Euclidean distance to confidence in [0.55, 0.85] range.

    Lower distance = higher confidence.
    Max possible distance is ~12 (all drives at opposite extremes).
    """
    max_distance = 12.0
    normalized = min(distance / max_distance, 1.0)
    return round(0.85 - (normalized * 0.30), 2)


class FanCalibrationService:
    @staticmethod
    def start_quiz(db: Session, orbit_profile_id: str) -> dict:
        """Create a new FanCalibration with neutral drives.

        Returns session_token and the first question.
        """
        token = secrets.token_urlsafe(32)
        cal = FanCalibration(
            id=str(ULID()),
            orbit_profile_id=orbit_profile_id,
            session_token=token,
            drives=dict(NEUTRAL_DRIVES),
            answers=[],
            confidence=0.0,
        )
        db.add(cal)
        db.flush()

        return {
            "session_token": token,
            "question": QUIZ_QUESTIONS[0],
            "question_number": 1,
            "total_questions": len(QUIZ_QUESTIONS),
        }

    @staticmethod
    def answer(db: Session, session_token: str, question_id: int, answer: str) -> dict:
        """Record an answer and update drives.

        answer must be 'a' or 'b'.
        If all 5 answered, auto-completes and returns result.
        Otherwise returns next question.
        """
        stmt = select(FanCalibration).where(FanCalibration.session_token == session_token)
        cal = db.execute(stmt).scalar_one_or_none()
        if not cal:
            raise ValueError(f"Calibration not found for token: {session_token}")

        if answer not in ("a", "b"):
            raise ValueError(f"Invalid answer: {answer}. Must be 'a' or 'b'.")

        # Find the question
        question = None
        for q in QUIZ_QUESTIONS:
            if q["id"] == question_id:
                question = q
                break
        if not question:
            raise ValueError(f"Invalid question_id: {question_id}")

        # Apply drive adjustments
        drive_deltas = question[answer]["drives"]
        updated_drives = dict(cal.drives)
        for drive_key, delta in drive_deltas.items():
            updated_drives[drive_key] = updated_drives.get(drive_key, 5) + delta
        cal.drives = updated_drives

        # Record answer
        updated_answers = list(cal.answers)
        updated_answers.append({"question_id": question_id, "answer": answer})
        cal.answers = updated_answers

        db.flush()

        # Check if quiz is complete
        if len(updated_answers) >= len(QUIZ_QUESTIONS):
            return FanCalibrationService._complete(db, cal)

        # Return next question
        next_idx = len(updated_answers)
        return {
            "session_token": session_token,
            "question": QUIZ_QUESTIONS[next_idx],
            "question_number": next_idx + 1,
            "total_questions": len(QUIZ_QUESTIONS),
        }

    @staticmethod
    def _complete(db: Session, cal: FanCalibration) -> dict:
        """Match drives to closest persona via Euclidean distance."""
        # Find the creator's personas
        stmt = (
            select(OrbitPersona)
            .where(OrbitPersona.orbit_profile_id == cal.orbit_profile_id)
            .order_by(OrbitPersona.order_index)
        )
        personas = list(db.execute(stmt).scalars().all())

        best_persona = None
        best_distance = float("inf")

        for persona in personas:
            pi_profile = persona.pi_profile
            if pi_profile not in DRIVE_TARGETS:
                continue
            target = DRIVE_TARGETS[pi_profile]
            distance = _euclidean_distance(cal.drives, target)
            if distance < best_distance:
                best_distance = distance
                best_persona = persona

        if best_persona:
            cal.persona_id = best_persona.id
            cal.confidence = _confidence_from_distance(best_distance)
        else:
            cal.confidence = 0.55

        db.flush()

        return {
            "session_token": cal.session_token,
            "completed": True,
            "persona_id": cal.persona_id,
            "persona_name": best_persona.display_name if best_persona else None,
            "persona_emoji": best_persona.emoji if best_persona else None,
            "confidence": cal.confidence,
            "drives": cal.drives,
        }

    @staticmethod
    def get_result(db: Session, session_token: str) -> dict | None:
        """Return persona result for a completed quiz."""
        stmt = select(FanCalibration).where(FanCalibration.session_token == session_token)
        cal = db.execute(stmt).scalar_one_or_none()
        if not cal:
            return None

        if not cal.persona_id:
            return None

        persona = db.get(OrbitPersona, cal.persona_id)
        return {
            "session_token": cal.session_token,
            "completed": True,
            "persona_id": cal.persona_id,
            "persona_name": persona.display_name if persona else None,
            "persona_emoji": persona.emoji if persona else None,
            "confidence": cal.confidence,
            "drives": cal.drives,
        }
