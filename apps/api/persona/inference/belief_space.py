"""Belief Space — competitive knowledge source loading for Otto's context window.

Five knowledge sources (Domain, Normative, Situational, Topographic, Historical)
compete for context budget based on task relevance and track record.

Implements Reynolds' Cultural Algorithm belief space as a Global Workspace:
specialized modules pitch guidance, attention mechanism selects who gets the mic.

Pure functions. No API calls. No new services. Same pattern as temporal.py.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


SOURCE_NAMES = ["domain", "normative", "situational", "topographic", "historical"]

DEFAULT_BUDGET = 800  # tokens allocated to warm-start context


@dataclass
class KnowledgeSource:
    """One knowledge source module in the belief space."""
    name: str
    weight: float = 0.2
    payload: str = ""
    energy: float = 1.0       # Reynolds' predator energy — wins increase, misses decrease
    last_win: str | None = None  # ISO timestamp of last positive signal


@dataclass
class BeliefSpace:
    """The full belief space — five competing knowledge sources."""
    sources: dict[str, KnowledgeSource] = field(default_factory=lambda: {
        name: KnowledgeSource(name=name) for name in SOURCE_NAMES
    })
    attention_profile: list[float] = field(default_factory=lambda: [0.2] * 5)
    workspace_budget: int = DEFAULT_BUDGET
    phase: str = "warm_start"


# ── Helpers ──────────────────────────────────────────────────────────


def _parse_iso(ts: str) -> datetime:
    """Parse ISO 8601 timestamp string to timezone-aware datetime."""
    ts = ts.replace("Z", "+00:00")
    return datetime.fromisoformat(ts)


def _part_of_day(hour: int) -> str:
    """Map hour to part of day."""
    if 5 <= hour <= 11:
        return "morning"
    if 12 <= hour <= 16:
        return "afternoon"
    if 17 <= hour <= 20:
        return "evening"
    return "late_night"


def _gap_hours(last_active: str, now: datetime) -> float:
    """Hours since last session."""
    last = _parse_iso(last_active)
    return (now - last).total_seconds() / 3600


# ── Phase 1: Session Classifier ─────────────────────────────────────


def classify_session(
    session_data: dict,
    now: datetime | None = None,
) -> list[float]:
    """Phase 1 classifier: session signals → 5-element attention profile.

    Reads three signals:
    1. Time context (part of day, gap since last session)
    2. Last session summary (presence/absence, content hints)
    3. Open items (count, urgency)

    Returns: [Domain, Normative, Situational, Topographic, Historical]
    Weights sum to 1.0. Energy from belief_state modulates final weights.
    """
    now = now or datetime.now(timezone.utc)

    # ── Extract signals ──
    part = _part_of_day(now.hour)
    last_active = session_data.get("last_active", "")
    gap = _gap_hours(last_active, now) if last_active else 999.0
    session_count = session_data.get("session_count", 0)
    summary = session_data.get("conversation_summary", "") or ""
    open_items = session_data.get("open_items", []) or []
    has_summary = bool(summary.strip())
    has_open_items = len(open_items) > 0

    # ── Base weights by session type ──
    weights = [0.2, 0.2, 0.2, 0.2, 0.2]  # [D, N, S, T, H]

    # Cold start: no history to draw on
    if session_count == 0 or (not has_summary and gap > 168):  # >1 week
        weights = [0.35, 0.2, 0.0, 0.15, 0.3]
    # Continuation: short gap + open items
    elif gap < 2 and has_open_items:
        weights = [0.15, 0.25, 0.30, 0.10, 0.20]
    # Exploration: long gap, no pressing items
    elif gap > 24 and not has_open_items:
        weights = [0.10, 0.10, 0.20, 0.40, 0.20]
    # Deep work: late night
    elif part == "late_night":
        weights = [0.30, 0.10, 0.20, 0.20, 0.20]
    # Morning fresh start
    elif part == "morning" and gap > 8:
        weights = [0.20, 0.15, 0.15, 0.30, 0.20]
    # Afternoon grind
    elif part == "afternoon" and has_open_items:
        weights = [0.20, 0.25, 0.25, 0.10, 0.20]

    # ── Historical referee: energy modulation ──
    belief_state = session_data.get("belief_state", {})
    energy = belief_state.get("energy", {})

    energy_values = [
        energy.get("domain", 1.0),
        energy.get("normative", 1.0),
        energy.get("situational", 1.0),
        energy.get("topographic", 1.0),
        energy.get("historical", 1.0),
    ]

    # Multiply weights by energy, then renormalize
    modulated = [w * e for w, e in zip(weights, energy_values)]
    total = sum(modulated)
    if total > 0:
        modulated = [w / total for w in modulated]

    return modulated


# ── Phase 1: Payload Assembly ────────────────────────────────────────


def compute_payloads(
    attention_profile: list[float],
    session_data: dict,
    budget: int = DEFAULT_BUDGET,
) -> dict[str, str]:
    """Assemble context payload per source, sized to weight allocation.

    Each source gets budget * weight tokens worth of context.
    A source at weight 0.0 gets empty string (not loaded).
    """
    names = SOURCE_NAMES
    payloads = {}

    for i, name in enumerate(names):
        weight = attention_profile[i]
        if weight < 0.01:
            payloads[name] = ""
            continue

        if name == "domain":
            payloads[name] = _assemble_domain(session_data)
        elif name == "normative":
            payloads[name] = _assemble_normative(session_data)
        elif name == "situational":
            payloads[name] = _assemble_situational(session_data)
        elif name == "topographic":
            payloads[name] = _assemble_topographic(session_data)
        elif name == "historical":
            payloads[name] = _assemble_historical(session_data)

    return payloads


def _assemble_domain(session_data: dict) -> str:
    """Domain KS: PI profile, archetype, chamber, team structure."""
    lines = []
    persona = session_data.get("active_persona", "Captain")
    chamber = session_data.get("active_chamber", "Discovery")
    lines.append(f"Active profile: {persona} in {chamber}")

    team = session_data.get("team")
    if team:
        balance = team.get("sovereign_balance")
        if balance:
            labels = ["D", "E", "C", "F"]
            balance_str = ", ".join(f"{l}:{v:+.1f}" for l, v in zip(labels, balance))
            lines.append(f"Team balance: [{balance_str}]")
        gaps = team.get("gaps")
        if gaps:
            lines.append(f"Team gaps: {', '.join(gaps)}")

    playbook = session_data.get("playbook")
    if playbook:
        lines.append(
            f"Playbook: {playbook.get('name', '?')} "
            f"({playbook.get('status', '?')}, node: {playbook.get('current_node', '?')})"
        )

    return "\n".join(lines)


def _assemble_normative(session_data: dict) -> str:
    """Normative KS: constraints, guardrails, autonomy ceiling, cost limits."""
    lines = []
    ceiling = session_data.get("autonomy_ceiling")
    if ceiling is not None:
        lines.append(f"Autonomy ceiling: {ceiling}")

    prefs = session_data.get("preferences", {})
    if prefs:
        tier = prefs.get("default_model_tier", "sonnet")
        verbosity = prefs.get("verbosity", "normal")
        lines.append(f"Model tier: {tier}, verbosity: {verbosity}")
        if prefs.get("hard_gates_enabled"):
            lines.append("Hard gates: enabled")

    cg = session_data.get("compensatory_generosity")
    if cg and cg.get("enabled"):
        triggers = cg.get("triggers", [])
        if triggers:
            lines.append(f"Compensatory friction: {len(triggers)} active triggers")

    return "\n".join(lines)


def _assemble_situational(session_data: dict) -> str:
    """Situational KS: episodes, summaries, open items, rocks, eval."""
    lines = []
    summary = session_data.get("conversation_summary", "")
    if summary and summary.strip():
        lines.append(f"Last session: {summary.strip()}")

    open_items = session_data.get("open_items", [])
    if open_items:
        items_display = []
        for item in open_items[:5]:
            if isinstance(item, dict):
                items_display.append(": ".join(f"{k}: {v}" for k, v in item.items()))
            else:
                items_display.append(str(item))
        lines.append(f"Open items ({len(open_items)}): {'; '.join(items_display)}")

    rocks = session_data.get("rocks", {})
    if rocks and rocks.get("total"):
        lines.append(f"Rocks: {rocks['total']} lifetime")

    last_eval = session_data.get("last_eval", {})
    if last_eval and last_eval.get("overall"):
        lines.append(f"Last eval: {last_eval['overall']}/5 (session {last_eval.get('session_number', '?')})")

    contradiction_log = session_data.get("contradiction_log", [])
    if contradiction_log:
        lines.append(f"Contradictions logged: {len(contradiction_log)}")

    return "\n".join(lines)


def _assemble_topographic(session_data: dict) -> str:
    """Topographic KS: benchmark landscape, novelty, drift."""
    lines = []
    usage = session_data.get("usage", {})
    if usage:
        total = usage.get("total_sessions", 0)
        if total:
            lines.append(f"Total sessions: {total}")
        persona_freq = usage.get("persona_frequency", {})
        if persona_freq:
            top = sorted(persona_freq.items(), key=lambda x: x[1], reverse=True)[:3]
            freq_str = ", ".join(f"{p}:{c}" for p, c in top)
            lines.append(f"Top personas: {freq_str}")

    return "\n".join(lines) if lines else "No landscape data yet."


def _assemble_historical(session_data: dict) -> str:
    """Historical KS: temporal patterns, cadence, generation stage."""
    from inference.temporal import compute_awareness, format_awareness_block
    try:
        awareness = compute_awareness(session_data)
        return format_awareness_block(awareness)
    except Exception:
        return "Temporal awareness unavailable."


# ── Phase 1: Workspace Formatter ─────────────────────────────────────


_SECTION_LABELS = {
    "domain": "DOMAIN (Analytical)",
    "normative": "NORMATIVE (Organized)",
    "situational": "SITUATIONAL (Experiential)",
    "topographic": "TOPOGRAPHIC (Landscape)",
    "historical": "HISTORICAL (Temporal)",
}


def format_workspace(payloads: dict[str, str]) -> str:
    """Assemble the final belief-space context block for injection.

    Skips empty payloads. Adds section headers for readability.
    """
    lines = ["BELIEF SPACE:"]

    for name in SOURCE_NAMES:
        payload = payloads.get(name, "")
        if not payload or not payload.strip():
            continue
        label = _SECTION_LABELS.get(name, name.upper())
        lines.append(f"\n[{label}]")
        lines.append(payload.strip())

    return "\n".join(lines)


# ── Phase 2: Per-Turn Rebidding ──────────────────────────────────────


_DOMAIN_KEYWORDS = {
    "architecture", "module", "refactor", "schema", "model", "system",
    "profile", "code", "function", "class", "design", "structure",
    "component", "interface", "api", "endpoint", "database",
}
_NORMATIVE_KEYWORDS = {
    "budget", "cost", "constraint", "limit", "rule", "policy",
    "guardrail", "compliance", "security", "permission", "gate",
    "threshold", "ceiling", "deadline", "freeze",
}
_SITUATIONAL_KEYWORDS = {
    "talked", "said", "told", "met", "meeting", "yesterday",
    "remember", "last time", "before", "worked", "tried",
    "alex", "matt", "eric", "kyle", "katie", "jamie",
}
_TOPOGRAPHIC_KEYWORDS = {
    "explore", "haven't tried", "new", "novel", "alternative",
    "benchmark", "landscape", "discover", "brainstorm", "what if",
    "imagine", "possibility", "idea", "experiment",
}

_REBID_BOOST = 0.15


def rebid(
    user_message: str,
    current_profile: list[float],
) -> list[float]:
    """Phase 2 per-turn rebid: lightweight keyword signal → adjusted weights.

    Scans user message for domain-specific keywords.
    Boosts matching source weights, renormalizes.
    Returns unchanged profile if no keywords match.
    """
    msg_lower = user_message.lower()
    boosts = [0.0, 0.0, 0.0, 0.0, 0.0]

    keyword_sets = [
        _DOMAIN_KEYWORDS,
        _NORMATIVE_KEYWORDS,
        _SITUATIONAL_KEYWORDS,
        _TOPOGRAPHIC_KEYWORDS,
    ]

    for i, keywords in enumerate(keyword_sets):
        for kw in keywords:
            if kw in msg_lower:
                boosts[i] += _REBID_BOOST
                break  # One match per source is enough

    if sum(boosts) == 0:
        return current_profile

    adjusted = [w + b for w, b in zip(current_profile, boosts)]
    total = sum(adjusted)
    return [w / total for w in adjusted]


# ── Energy Update — Proportional Resilience ──────────────────────────


_ENERGY_FLOOR = 0.1
_ENERGY_CEILING = 2.0
_ROCK_BOOST = 0.15
_BASE_CONTRADICTION_PENALTY = 0.2
_NEUTRAL_DECAY = 0.02


def update_energy(current_energy: float, outcome: str) -> float:
    """Update a knowledge source's energy based on session outcome.

    Proportional resilience (dam/rapids model):
    - Rocks add fixed energy (building the dam)
    - Contradictions deal INVERSELY proportional damage
    - penalty = BASE_PENALTY / current_energy
    - A strong dam absorbs rapids; a weak dam washes out

    At energy 0.5 → penalty = 0.40 (devastating)
    At energy 1.0 → penalty = 0.20 (standard)
    At energy 1.5 → penalty = 0.13 (dam holds)
    At energy 2.0 → penalty = 0.10 (barely registers)
    """
    if outcome == "rock":
        new = current_energy + _ROCK_BOOST
    elif outcome == "contradiction":
        penalty = _BASE_CONTRADICTION_PENALTY / max(current_energy, _ENERGY_FLOOR)
        new = current_energy - penalty
    else:
        new = current_energy - _NEUTRAL_DECAY

    return max(_ENERGY_FLOOR, min(_ENERGY_CEILING, new))
