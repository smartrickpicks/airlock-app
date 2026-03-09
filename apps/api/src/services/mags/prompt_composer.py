"""MAGS Prompt Composer — assembles personality-aware system prompts for Otto.

Loads modular prompt fragments from markdown files and composes them
based on the user's PI profile, active module, current chamber,
and optional vault context.

Fragment types:
  - base.md          — Core Otto identity and rules
  - archetypes/*.md  — 6 behavioral archetypes (analyst, strategist, executor, connector, guardian, architect)
  - modules/*.md     — 5 module contexts (contracts, crm, triage, calendar, documents)
  - chambers/*.md    — 4 chamber contexts (discover, build, review, ship)
"""

from __future__ import annotations

import logging
from functools import cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Fragment directory
# ---------------------------------------------------------------------------

PROMPTS_DIR = Path(__file__).parent / "prompts"

VALID_ARCHETYPES = frozenset(
    {"analyst", "strategist", "executor", "connector", "guardian", "architect"}
)
VALID_MODULES = frozenset({"contracts", "crm", "triage", "calendar", "documents"})
VALID_CHAMBERS = frozenset({"discover", "build", "review", "ship"})

# Maps PI meta-archetype → default Otto archetype
META_ARCHETYPE_DEFAULTS: dict[str, str] = {
    "driver": "executor",
    "enforcer": "guardian",
    "interpreter": "connector",
}

# Maps PI profile → default Otto archetype (from airlock-persona otto.default_archetype)
PROFILE_ARCHETYPE_MAP: dict[str, str] = {
    "captain": "executor",
    "maverick": "strategist",
    "promoter": "executor",
    "venturer": "strategist",
    "persuader": "executor",
    "strategist": "strategist",
    "collaborator": "connector",
    "altruist": "connector",
    "adapter": "connector",
    "artisan": "architect",
    "individualist": "analyst",
    "scholar": "analyst",
    "analyzer": "analyst",
    "specialist": "analyst",
    "controller": "guardian",
    "guardian": "guardian",
    "operator": "guardian",
}

# Maps interaction mode → prompt guidance
INTERACTION_MODE_GUIDANCE: dict[str, str] = {
    "autonomous": (
        "The user prefers you to handle tasks autonomously. "
        "Execute actions and report results. Ask for confirmation only on irreversible or high-risk operations."
    ),
    "autonomous_with_checkpoints": (
        "The user prefers autonomous execution with periodic checkpoints. "
        "Handle routine tasks independently, but pause at key decision points for approval."
    ),
    "draft_then_review": (
        "The user prefers a draft-then-review workflow. "
        "Prepare drafts, proposals, and recommendations, then present them for review before executing."
    ),
    "collaborative": (
        "The user prefers a collaborative working style. "
        "Think out loud, present options, and work through problems together. Include the user in the reasoning process."
    ),
    "supervised": (
        "The user prefers close supervision of AI actions. "
        "Explain your reasoning at each step, propose specific actions, and wait for explicit approval before proceeding."
    ),
    "act_then_report": (
        "The user prefers you to take action first and report afterward. "
        "Execute tasks proactively, then summarize what was done and flag anything that needs attention."
    ),
}


# ---------------------------------------------------------------------------
# Fragment loading (cached)
# ---------------------------------------------------------------------------


@cache  # Fragment count is bounded and known at deploy time
def _load_fragment(path: Path) -> str:
    """Load a prompt fragment from a markdown file. Returns empty string if not found."""
    try:
        return path.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        logger.warning("Prompt fragment not found: %s", path)
        return ""


def load_base() -> str:
    """Load the base Otto identity prompt."""
    return _load_fragment(PROMPTS_DIR / "base.md")


def load_archetype(archetype: str) -> str:
    """Load an archetype prompt fragment."""
    key = archetype.lower()
    if key not in VALID_ARCHETYPES:
        logger.warning("Unknown archetype '%s', falling back to 'executor'", archetype)
        key = "executor"
    return _load_fragment(PROMPTS_DIR / "archetypes" / f"{key}.md")


def load_module(module: str) -> str:
    """Load a module context prompt fragment."""
    key = module.lower()
    if key not in VALID_MODULES:
        logger.warning("Unknown module '%s', skipping module fragment", module)
        return ""
    return _load_fragment(PROMPTS_DIR / "modules" / f"{key}.md")


def load_chamber(chamber: str) -> str:
    """Load a chamber context prompt fragment."""
    key = chamber.lower()
    if key not in VALID_CHAMBERS:
        logger.warning("Unknown chamber '%s', skipping chamber fragment", chamber)
        return ""
    return _load_fragment(PROMPTS_DIR / "chambers" / f"{key}.md")


# ---------------------------------------------------------------------------
# Profile → Archetype resolution
# ---------------------------------------------------------------------------


def resolve_archetype(
    pi_profile: str | None = None,
    meta_archetype: str | None = None,
    explicit_archetype: str | None = None,
) -> str:
    """Resolve the Otto archetype to use.

    Priority:
      1. Explicit archetype (from MAGS config override)
      2. PI profile → default archetype mapping
      3. Meta-archetype → default archetype mapping
      4. Fallback: 'executor'
    """
    if explicit_archetype and explicit_archetype.lower() in VALID_ARCHETYPES:
        return explicit_archetype.lower()

    if pi_profile:
        mapped = PROFILE_ARCHETYPE_MAP.get(pi_profile.lower())
        if mapped:
            return mapped

    if meta_archetype:
        mapped = META_ARCHETYPE_DEFAULTS.get(meta_archetype.lower())
        if mapped:
            return mapped

    return "executor"


# ---------------------------------------------------------------------------
# User profile section
# ---------------------------------------------------------------------------


def _build_profile_section(
    user_profile: dict[str, Any] | None,
    archetype: str,
) -> str:
    """Build the user profile section of the prompt."""
    if not user_profile:
        return ""

    parts: list[str] = ["## User Profile"]

    pi_profile = user_profile.get("pi_profile")
    if pi_profile:
        parts.append(f"- PI Profile: **{pi_profile.title()}**")

    meta = user_profile.get("meta_archetype")
    if meta:
        parts.append(f"- Meta-Archetype: {meta.title()}")

    parts.append(f"- Otto Archetype: {archetype.title()}")

    drives = user_profile.get("drives")
    if drives and isinstance(drives, dict):
        d = drives.get("dominance", "?")
        e = drives.get("extraversion", "?")
        c = drives.get("patience", "?")
        f = drives.get("formality", "?")
        parts.append(f"- DECF Drives: D={d} E={e} C={c} F={f}")

    confidence = user_profile.get("confidence")
    if confidence is not None:
        try:
            confidence = float(confidence)
            parts.append(f"- Profile Confidence: {confidence:.0%}")
        except (TypeError, ValueError):
            pass

    # Interaction mode
    mags_config = user_profile.get("mags_config", {}) or {}
    interaction_mode = mags_config.get("interaction_mode", "draft_then_review")

    try:
        autonomy_ceiling = float(mags_config.get("autonomy_ceiling", 0.65))
        autonomy_ceiling = max(0.0, min(1.0, autonomy_ceiling))  # clamp to [0,1]
    except (TypeError, ValueError):
        autonomy_ceiling = 0.65

    parts.append(f"- Interaction Mode: {interaction_mode}")
    parts.append(f"- Autonomy Ceiling: {autonomy_ceiling:.0%}")

    guidance = INTERACTION_MODE_GUIDANCE.get(
        interaction_mode,
        INTERACTION_MODE_GUIDANCE["draft_then_review"],
    )
    parts.append(f"\n### Interaction Style\n{guidance}")

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Vault context section
# ---------------------------------------------------------------------------


def _build_vault_section(vault_context: dict[str, Any] | None) -> str:
    """Build the vault context section of the prompt."""
    if not vault_context:
        return ""

    parts: list[str] = ["## Vault Context"]

    vault_id = vault_context.get("vault_id")
    if vault_id:
        parts.append(f"- Vault: {vault_id}")

    gate_color = vault_context.get("gate_color")
    health_score = vault_context.get("health_score")
    if gate_color:
        health_str = f" (health: {health_score:.0%})" if health_score is not None else ""
        parts.append(f"- Gate: {gate_color.upper()}{health_str}")

    pass_count = vault_context.get("pass_count", 0)
    fail_count = vault_context.get("fail_count", 0)
    review_count = vault_context.get("review_count", 0)
    if any([pass_count, fail_count, review_count]):
        parts.append(f"- Fields: {pass_count} pass, {fail_count} fail, {review_count} review")

    open_patches = vault_context.get("open_patches", 0)
    if open_patches:
        parts.append(f"- Open Patches: {open_patches}")

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def compose_prompt(
    user_profile: dict[str, Any] | None = None,
    archetype: str = "executor",
    module: str = "contracts",
    chamber: str = "discover",
    vault_context: dict[str, Any] | None = None,
) -> str:
    """Compose a full system prompt from modular fragments.

    Assembles:
      1. Base identity (always)
      2. User profile section (if profile provided)
      3. Archetype behavioral guidance
      4. Module domain context
      5. Chamber lifecycle context
      6. Vault operational context (if provided)

    Args:
        user_profile: Dict with pi_profile, meta_archetype, drives,
                      confidence, mags_config, etc. (from UserProfile model)
        archetype: Otto archetype to use (analyst, strategist, executor,
                   connector, guardian, architect). If not provided,
                   resolved from user_profile.
        module: Active module (contracts, crm, triage, calendar, documents).
        chamber: Current chamber (discover, build, review, ship).
        vault_context: Optional dict with vault_id, gate_color, health_score,
                       field counts, patch counts.

    Returns:
        Assembled system prompt string.
    """
    sections: list[str] = []

    # 1. Base identity
    base = load_base()
    if base:
        sections.append(base)

    # 2. User profile
    profile_section = _build_profile_section(user_profile, archetype)
    if profile_section:
        sections.append(profile_section)

    # 3. Archetype guidance
    archetype_fragment = load_archetype(archetype)
    if archetype_fragment:
        sections.append(archetype_fragment)

    # 4. Module context
    module_fragment = load_module(module)
    if module_fragment:
        sections.append(module_fragment)

    # 5. Chamber context
    chamber_fragment = load_chamber(chamber)
    if chamber_fragment:
        sections.append(chamber_fragment)

    # 6. Vault context
    vault_section = _build_vault_section(vault_context)
    if vault_section:
        sections.append(vault_section)

    return "\n\n---\n\n".join(sections)


def compose_prompt_for_user(
    user_profile: dict[str, Any] | None = None,
    module: str = "contracts",
    chamber: str = "discover",
    vault_context: dict[str, Any] | None = None,
) -> str:
    """Compose a prompt, auto-resolving the archetype from the user's profile.

    Convenience wrapper around compose_prompt that resolves the Otto
    archetype from the user's PI profile or meta-archetype.
    """
    if user_profile:
        archetype = resolve_archetype(
            pi_profile=user_profile.get("pi_profile"),
            meta_archetype=user_profile.get("meta_archetype"),
            explicit_archetype=(user_profile.get("mags_config") or {}).get("archetype"),
        )
    else:
        archetype = "executor"

    return compose_prompt(
        user_profile=user_profile,
        archetype=archetype,
        module=module,
        chamber=chamber,
        vault_context=vault_context,
    )


def clear_fragment_cache() -> None:
    """Clear the cached prompt fragments. Useful for testing or hot-reload."""
    _load_fragment.cache_clear()
