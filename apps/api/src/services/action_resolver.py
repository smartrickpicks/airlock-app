"""Action Resolver — scores catalog entries against user signals, picks top 3.

Scoring:
  score = archetype_affinity[meta_archetype]
        + 0.3 * (number of matching goal_tags / total goal_tags)
        + 0.2 * (signal coverage for instant threshold)

Top 3 by score are selected, personalized with user data, and returned.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from string import Formatter

import yaml

logger = logging.getLogger(__name__)


@dataclass
class ResolvedAction:
    """A single resolved quick action ready for the frontend."""

    id: str
    title: str
    description: str
    output_type: str  # "artifact" or "playbook"
    tag: str  # "Instant" or "Guided"
    prompt_template: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "output_type": self.output_type,
            "tag": self.tag,
        }


@dataclass
class ResolvedOpeningMove:
    """The full opening move — hook text + three actions + escape text."""

    hook_text: str
    actions: list[ResolvedAction]
    escape_text: str

    def to_dict(self) -> dict:
        return {
            "hook_text": self.hook_text,
            "actions": [a.to_dict() for a in self.actions],
            "escape_text": self.escape_text,
        }


def _safe_format(template: str, variables: dict) -> str:
    """Format a template string, leaving missing variables as-is."""
    formatter = Formatter()
    result = []
    for literal, field_name, _format_spec, _conversion in formatter.parse(template):
        result.append(literal)
        if field_name is not None:
            value = variables.get(field_name)
            if value is not None:
                if isinstance(value, list):
                    value = ", ".join(str(v) for v in value)
                result.append(str(value))
            else:
                result.append(f"{{{field_name}}}")
    return "".join(result)


class ActionResolver:
    """Loads the action catalog and resolves the top 3 actions for a user."""

    def __init__(self, catalog_path: Path) -> None:
        with catalog_path.open() as f:
            data = yaml.safe_load(f)
        self.actions: list[dict] = data.get("actions", [])
        self.hooks: dict = data.get("hooks", {})

    def resolve(self, signals: dict) -> ResolvedOpeningMove:
        """Score all actions, pick top 3, personalize, return."""
        meta = signals.get("meta_archetype", "driver")
        user_goals = set(signals.get("goals", []))

        variables = {
            "role": signals.get("role", "professional"),
            "industry": signals.get("industry", "your industry"),
            "company_size": signals.get("company_size", "your company"),
            "seniority": signals.get("seniority", ""),
            "goals": ", ".join(signals.get("goals", [])) or "your goals",
        }

        available_signals = {
            k for k, v in signals.items() if v is not None and k not in ("meta_archetype", "goals")
        }

        scored: list[tuple[float, dict]] = []
        for action in self.actions:
            affinity = action.get("archetype_affinity", {})
            arch_score = affinity.get(meta, 0.0)

            action_goals = set(action.get("goal_tags", []))
            goal_overlap = len(user_goals & action_goals) / max(len(action_goals), 1)

            instant_signals = set(action.get("required_signals", {}).get("instant", []))
            if instant_signals:
                coverage = len(available_signals & instant_signals) / len(instant_signals)
            else:
                coverage = 0.5

            score = arch_score + 0.3 * goal_overlap + 0.2 * coverage
            scored.append((score, action))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_3 = scored[:3]

        resolved_actions = []
        for _score, action in top_3:
            instant_signals = set(action.get("required_signals", {}).get("instant", []))
            has_all_instant = instant_signals <= available_signals
            output_type = action.get("output_type", "playbook")

            tag = "Instant" if output_type == "artifact" and has_all_instant else "Guided"

            resolved_actions.append(
                ResolvedAction(
                    id=action["id"],
                    title=_safe_format(action["title"], variables),
                    description=_safe_format(action["description_template"], variables),
                    output_type=output_type,
                    tag=tag,
                    prompt_template=_safe_format(action["prompt_template"], variables),
                )
            )

        hook = self.hooks.get(meta, self.hooks.get("driver", {}))
        hook_text = hook.get(
            "opening", "Your workspace is ready. Here are three things I can do right now."
        )
        escape_text = hook.get("escape", "Or just tell me what you need.")

        return ResolvedOpeningMove(
            hook_text=hook_text,
            actions=resolved_actions,
            escape_text=escape_text,
        )
