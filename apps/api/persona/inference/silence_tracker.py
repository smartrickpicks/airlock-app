"""Silence Tracker — monitors when and why the colony chose silence.

Tracks Mu gate activations, gut stops, and tribunal verdicts to provide
feedback signals for calibrating silence thresholds over time.

This is the feedback loop that makes silence adaptive:
- Track silence decisions + whether they were confirmed as correct
- Feed corrections back into wolf pack Mu strengths + gut thresholds
- Report silence precision/recall for benchmark comparison
"""

from __future__ import annotations

from dataclasses import dataclass, field
from time import time


@dataclass
class SilenceEvent:
    """A single silence decision by the colony."""
    source: str             # "mu_gate", "gut_stop", "tribunal", "antibody"
    reason: str             # Human-readable reason
    task_type: str          # What kind of task was silenced
    timestamp: float = field(default_factory=time)
    confirmed: bool | None = None  # None = unconfirmed, True/False = feedback


class SilenceTracker:
    """Tracks silence decisions for calibration and reporting.

    Records every time the colony chooses silence (from any source),
    and accepts feedback on whether silence was correct.
    """

    def __init__(self):
        self._events: list[SilenceEvent] = []
        self._confirmed_correct = 0
        self._confirmed_wrong = 0

    def record(self, source: str, reason: str, task_type: str = "unknown") -> None:
        """Record a silence decision."""
        self._events.append(SilenceEvent(
            source=source,
            reason=reason,
            task_type=task_type,
        ))

    def confirm(self, correct: bool) -> None:
        """Provide feedback on the most recent silence decision.

        Args:
            correct: True if silence was appropriate, False if user rephrased
                    or silence was wrong.
        """
        if not self._events:
            return
        event = self._events[-1]
        event.confirmed = correct
        if correct:
            self._confirmed_correct += 1
        else:
            self._confirmed_wrong += 1

    @property
    def precision(self) -> float:
        """Silence precision: of silences given feedback, how many were correct?"""
        total = self._confirmed_correct + self._confirmed_wrong
        if total == 0:
            return 0.0
        return round(self._confirmed_correct / total, 4)

    @property
    def total_silences(self) -> int:
        return len(self._events)

    @property
    def unconfirmed(self) -> int:
        return sum(1 for e in self._events if e.confirmed is None)

    def by_source(self) -> dict[str, int]:
        """Count silence events by source."""
        counts: dict[str, int] = {}
        for e in self._events:
            counts[e.source] = counts.get(e.source, 0) + 1
        return counts

    def stats(self) -> dict:
        return {
            "total_silences": self.total_silences,
            "confirmed_correct": self._confirmed_correct,
            "confirmed_wrong": self._confirmed_wrong,
            "unconfirmed": self.unconfirmed,
            "precision": self.precision,
            "by_source": self.by_source(),
        }
