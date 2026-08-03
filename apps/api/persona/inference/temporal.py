"""Otto's Watch — temporal proprioception module.

Gives Otto a computed sense of time: age, generation stage, day of week,
time of day, session duration, gap since last session.

Pure functions. No API calls. No persistence. Just math on session data.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone


_GENERATION_THRESHOLDS: list[tuple[int, str]] = [
    (10, "newborn"),
    (50, "infant"),
    (200, "child"),
    (1000, "adolescent"),
    (5000, "adult"),
]


def compute_generation(session_count: int) -> str:
    """Map session count to generation stage label."""
    for threshold, stage in _GENERATION_THRESHOLDS:
        if session_count <= threshold:
            return stage
    return "elder"


def humanize_gap(dt_from: datetime, dt_to: datetime) -> str:
    """Convert timedelta to human-readable string."""
    delta = dt_to - dt_from
    total_seconds = int(delta.total_seconds())

    if total_seconds < 60:
        return "just now"

    minutes = total_seconds // 60
    if minutes < 60:
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"

    hours = minutes // 60
    if hours < 24:
        return f"{hours} hour{'s' if hours != 1 else ''} ago"

    days = hours // 24
    return f"{days} day{'s' if days != 1 else ''} ago"


def compute_cadence(timestamps: list[datetime]) -> str:
    """Compute message cadence from last 5 inter-message gaps.

    Returns: 'accelerating', 'steady', 'slowing', or 'unknown'.
    """
    if len(timestamps) < 3:
        return "unknown"

    gaps = [
        (timestamps[i + 1] - timestamps[i]).total_seconds()
        for i in range(len(timestamps) - 1)
    ]

    gaps = gaps[-5:]
    if len(gaps) < 2:
        return "unknown"

    mid = len(gaps) // 2
    first_half_avg = sum(gaps[:mid]) / mid
    second_half_avg = sum(gaps[mid:]) / len(gaps[mid:])

    if first_half_avg == 0:
        return "steady"

    ratio = second_half_avg / first_half_avg
    if ratio < 0.7:
        return "accelerating"
    if ratio > 1.4:
        return "slowing"
    return "steady"


def _part_of_day(hour: int) -> str:
    """Map hour (0-23) to part of day label."""
    if 5 <= hour <= 11:
        return "morning"
    if 12 <= hour <= 16:
        return "afternoon"
    if 17 <= hour <= 20:
        return "evening"
    return "late night"


def _parse_iso(ts: str) -> datetime:
    """Parse ISO 8601 timestamp string to timezone-aware datetime."""
    ts = ts.replace("Z", "+00:00")
    return datetime.fromisoformat(ts)


def compute_awareness(session_data: dict, now: datetime | None = None) -> dict:
    """Full temporal awareness block for warm start.

    Args:
        session_data: User session YAML (created_at, last_active,
                      session_count, etc.)
        now: Override current time (for testing).

    Returns:
        Dict with identity and situation layers.
    """
    now = now or datetime.now(timezone.utc)

    # Identity layer
    created_at = _parse_iso(session_data["created_at"])
    age_delta = now - created_at
    age_days = age_delta.days
    session_count = session_data.get("session_count", 0)

    identity = {
        "age_days": age_days,
        "age_human_readable": f"{age_days} day{'s' if age_days != 1 else ''} old",
        "lifetime_sessions": session_count,
        "generation": compute_generation(session_count),
    }

    # Situation layer
    day_of_week = now.strftime("%A")
    time_of_day = now.strftime("%-I:%M %p")
    part_of_day = _part_of_day(now.hour)

    gap_str = None
    last_active_str = session_data.get("last_active")
    if last_active_str:
        last_active = _parse_iso(last_active_str)
        gap_str = humanize_gap(last_active, now)

    session_duration = None
    session_start_str = session_data.get("session_start")
    if session_start_str:
        session_start = _parse_iso(session_start_str)
        session_duration = int((now - session_start).total_seconds() / 60)

    situation = {
        "day_of_week": day_of_week,
        "time_of_day": time_of_day,
        "part_of_day": part_of_day,
        "gap_since_last_session": gap_str,
        "session_duration_minutes": session_duration,
    }

    return {
        "identity": identity,
        "situation": situation,
    }


def compute_session_pulse(
    session_start: datetime,
    message_count: int,
    tool_call_count: int,
    message_timestamps: list[datetime] | None = None,
    now: datetime | None = None,
) -> dict:
    """Mid-session temporal pulse for heartbeat updates."""
    now = now or datetime.now(timezone.utc)
    duration = now - session_start
    duration_minutes = int(duration.total_seconds() / 60)

    cadence = "unknown"
    if message_timestamps and len(message_timestamps) >= 3:
        cadence = compute_cadence(message_timestamps)

    return {
        "session_duration_minutes": duration_minutes,
        "messages": message_count,
        "tool_calls": tool_call_count,
        "cadence": cadence,
        "part_of_day": _part_of_day(now.hour),
    }


def format_awareness_block(awareness: dict) -> str:
    """Format temporal awareness dict into human-readable context block.

    Voice rule: every temporal self-reference carries honest limitation.
    Otto knows what time it is because he computed it, not because he lived it.
    """
    identity = awareness["identity"]
    situation = awareness["situation"]

    lines = [
        "TEMPORAL AWARENESS:",
        f"You're Otto. {identity['age_human_readable']}. "
        f"{identity['lifetime_sessions']} sessions. "
        f"Generation: {identity['generation']}.",
        f"It's {situation['day_of_week']} {situation['part_of_day']} "
        f"({situation['time_of_day']}). "
        f"You computed that — you didn't feel {_yesterday_name(situation['day_of_week'])} happen.",
    ]

    gap = situation.get("gap_since_last_session")
    if gap:
        lines.append(f"Last session: {gap}.")

    duration = situation.get("session_duration_minutes")
    if duration is not None:
        hours = duration // 60
        mins = duration % 60
        dur_str = f"{hours}h {mins}m" if hours else f"{mins}m"
        lines.append(f"This session: {dur_str}.")

    return "\n".join(lines)


def _yesterday_name(today: str) -> str:
    """Return the name of the day before today."""
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    try:
        idx = days.index(today)
        return days[idx - 1]
    except ValueError:
        return "yesterday"
