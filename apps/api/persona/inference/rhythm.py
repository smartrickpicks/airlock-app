"""Otto's Heartbeat — rhythm detection from session history.

Discovers natural frequencies in user interaction patterns using
signal processing on session timestamps and energy histories.

Uses Lomb-Scargle periodogram (scipy.signal) because session data
is irregularly sampled — sessions don't happen at fixed intervals.

Pure functions. No API calls. No persistence. Just math on time-series.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any


def _parse_iso(ts: str) -> datetime:
    """Parse ISO 8601 timestamp string to timezone-aware datetime."""
    ts = ts.replace("Z", "+00:00")
    return datetime.fromisoformat(ts)


def _to_hours_since_epoch(timestamps: list[datetime]) -> list[float]:
    """Convert datetime list to hours since first timestamp."""
    if not timestamps:
        return []
    epoch = timestamps[0]
    return [(t - epoch).total_seconds() / 3600.0 for t in timestamps]


def detect_rhythm(session_history: list[dict[str, Any]]) -> dict[str, Any]:
    """Detect dominant rhythmic patterns in session history.

    Uses Lomb-Scargle periodogram for irregularly-sampled time series.
    Falls back to gap statistics if scipy is unavailable or data is sparse.

    Args:
        session_history: List of session entries with 'timestamp' fields.

    Returns:
        Dict with detected rhythm parameters:
        - dominant_period_hours: strongest detected cycle
        - secondary_period_hours: second strongest cycle
        - session_tempo: 'sprint' | 'steady' | 'recovery'
        - confidence: 0.0-1.0
        - last_computed: ISO timestamp
        - gap_stats: mean/median/std of inter-session gaps
    """
    if len(session_history) < 5:
        return _insufficient_data()

    # Parse timestamps
    timestamps = []
    for entry in session_history:
        ts = entry.get("timestamp")
        if ts:
            try:
                timestamps.append(_parse_iso(ts) if isinstance(ts, str) else ts)
            except (ValueError, TypeError):
                continue

    timestamps.sort()

    if len(timestamps) < 5:
        return _insufficient_data()

    # Compute inter-session gaps in hours
    gaps_hours = [
        (timestamps[i + 1] - timestamps[i]).total_seconds() / 3600.0
        for i in range(len(timestamps) - 1)
    ]

    gap_stats = _compute_gap_stats(gaps_hours)

    # Try Lomb-Scargle periodogram
    try:
        from scipy.signal import lombscargle
        import numpy as np

        result = _lombscargle_analysis(timestamps, gaps_hours)
        result["gap_stats"] = gap_stats
        result["last_computed"] = datetime.now(timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        return result

    except ImportError:
        # scipy not available — fall back to gap statistics
        return _gap_based_rhythm(gaps_hours, gap_stats)


def _lombscargle_analysis(
    timestamps: list[datetime], gaps_hours: list[float]
) -> dict[str, Any]:
    """Run Lomb-Scargle periodogram on session timestamps."""
    import warnings
    import numpy as np
    from scipy.signal import lombscargle

    # Convert to hours since first session
    t = np.array(_to_hours_since_epoch(timestamps))

    # Create a signal: 1.0 at each session time (event series)
    # We analyze the timing pattern, not amplitude
    x = np.ones_like(t)
    x -= x.mean()  # Zero-center

    # Test frequencies: periods from 1 hour to 7 days
    min_period = 1.0  # 1 hour
    max_period = 168.0  # 7 days
    n_freqs = 500

    # Angular frequencies (Lomb-Scargle uses angular freq)
    freqs = np.linspace(
        2 * np.pi / max_period, 2 * np.pi / min_period, n_freqs
    )

    # Compute periodogram (suppress harmless normalization warnings on sparse data)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        power = lombscargle(t, x, freqs, normalize=True)

    # Find peaks
    periods_hours = 2 * np.pi / freqs
    sorted_indices = np.argsort(power)[::-1]

    dominant_idx = sorted_indices[0]
    dominant_period = float(periods_hours[dominant_idx])
    dominant_power = float(power[dominant_idx])

    # Find secondary peak (at least 20% different period)
    secondary_period = None
    for idx in sorted_indices[1:]:
        candidate = float(periods_hours[idx])
        if abs(candidate - dominant_period) / dominant_period > 0.2:
            secondary_period = candidate
            break

    # Confidence: ratio of peak power to mean power
    mean_power = float(np.mean(power))
    confidence = min(1.0, dominant_power / (mean_power + 1e-8) / 10.0)

    # Session tempo from recent gaps
    tempo = _classify_tempo(gaps_hours)

    return {
        "dominant_period_hours": round(dominant_period, 1),
        "secondary_period_hours": round(secondary_period, 1)
        if secondary_period
        else None,
        "session_tempo": tempo,
        "confidence": round(confidence, 3),
    }


def _compute_gap_stats(gaps_hours: list[float]) -> dict[str, float]:
    """Compute basic statistics on inter-session gaps."""
    if not gaps_hours:
        return {"mean": 0, "median": 0, "std": 0, "min": 0, "max": 0}

    sorted_gaps = sorted(gaps_hours)
    n = len(sorted_gaps)
    mean = sum(sorted_gaps) / n
    median = sorted_gaps[n // 2]
    variance = sum((g - mean) ** 2 for g in sorted_gaps) / n
    std = math.sqrt(variance)

    return {
        "mean": round(mean, 1),
        "median": round(median, 1),
        "std": round(std, 1),
        "min": round(min(sorted_gaps), 1),
        "max": round(max(sorted_gaps), 1),
    }


def _classify_tempo(gaps_hours: list[float]) -> str:
    """Classify current session tempo from recent gaps.

    sprint: recent gaps shorter than historical mean (high frequency)
    recovery: recent gaps longer than historical mean (low frequency)
    steady: within normal range
    """
    if len(gaps_hours) < 3:
        return "steady"

    overall_mean = sum(gaps_hours) / len(gaps_hours)
    recent = gaps_hours[-3:]
    recent_mean = sum(recent) / len(recent)

    if overall_mean == 0:
        return "steady"

    ratio = recent_mean / overall_mean
    if ratio < 0.6:
        return "sprint"
    if ratio > 1.5:
        return "recovery"
    return "steady"


def _gap_based_rhythm(
    gaps_hours: list[float], gap_stats: dict[str, float]
) -> dict[str, Any]:
    """Fallback rhythm detection using gap statistics (no scipy)."""
    # Use median gap as dominant period estimate
    dominant_period = gap_stats.get("median", 0)

    # Low confidence since we're using simple stats
    confidence = min(0.5, len(gaps_hours) / 20.0)

    tempo = _classify_tempo(gaps_hours)

    return {
        "dominant_period_hours": round(dominant_period, 1),
        "secondary_period_hours": None,
        "session_tempo": tempo,
        "confidence": round(confidence, 3),
        "gap_stats": gap_stats,
        "last_computed": datetime.now(timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        ),
    }


def _insufficient_data() -> dict[str, Any]:
    """Return default rhythm when not enough data."""
    return {
        "dominant_period_hours": None,
        "secondary_period_hours": None,
        "session_tempo": "steady",
        "confidence": 0.0,
        "gap_stats": None,
        "last_computed": datetime.now(timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        ),
    }


def detect_energy_oscillation(
    energy_history: list[dict[str, Any]],
) -> dict[str, Any]:
    """Detect oscillation patterns in belief space energy levels.

    Looks for cyclic patterns in how energy rises and falls
    across sessions. A steady oscillation suggests a natural
    work/recovery rhythm in the user's interaction pattern.

    Args:
        energy_history: List of energy snapshots with timestamp and 5 source values.

    Returns:
        Dict with oscillation parameters per source.
    """
    if len(energy_history) < 5:
        return {"oscillating": False, "sources": {}}

    sources = ["domain", "normative", "situational", "topographic", "historical"]
    results: dict[str, Any] = {}

    for source in sources:
        values = [e.get(source, 1.0) for e in energy_history]

        # Count direction changes (peaks and troughs)
        direction_changes = 0
        for i in range(1, len(values) - 1):
            if (values[i] > values[i - 1] and values[i] > values[i + 1]) or (
                values[i] < values[i - 1] and values[i] < values[i + 1]
            ):
                direction_changes += 1

        # Oscillation ratio: direction changes per data point
        osc_ratio = direction_changes / (len(values) - 2) if len(values) > 2 else 0

        # Amplitude: range of values
        amplitude = max(values) - min(values)

        results[source] = {
            "oscillating": osc_ratio > 0.3,
            "oscillation_ratio": round(osc_ratio, 3),
            "amplitude": round(amplitude, 3),
            "current": round(values[-1], 3),
            "trend": "rising" if len(values) >= 2 and values[-1] > values[-2] else "falling",
        }

    any_oscillating = any(r["oscillating"] for r in results.values())

    return {
        "oscillating": any_oscillating,
        "sources": results,
    }


def format_rhythm_block(rhythm: dict[str, Any]) -> str:
    """Format detected rhythm into human-readable context block."""
    if not rhythm or rhythm.get("confidence", 0) == 0:
        return "RHYTHM: Insufficient data. No heartbeat detected yet."

    lines = ["RHYTHM:"]

    period = rhythm.get("dominant_period_hours")
    if period:
        if period < 2:
            period_str = f"{int(period * 60)} minutes"
        elif period < 48:
            period_str = f"{period:.1f} hours"
        else:
            period_str = f"{period / 24:.1f} days"
        lines.append(f"Dominant cycle: {period_str}")

    secondary = rhythm.get("secondary_period_hours")
    if secondary:
        if secondary < 48:
            sec_str = f"{secondary:.1f} hours"
        else:
            sec_str = f"{secondary / 24:.1f} days"
        lines.append(f"Secondary cycle: {sec_str}")

    tempo = rhythm.get("session_tempo", "steady")
    lines.append(f"Current tempo: {tempo}")

    confidence = rhythm.get("confidence", 0)
    lines.append(f"Confidence: {confidence:.0%}")

    gap_stats = rhythm.get("gap_stats")
    if gap_stats:
        lines.append(
            f"Session gaps: median {gap_stats['median']}h, "
            f"range {gap_stats['min']}-{gap_stats['max']}h"
        )

    return "\n".join(lines)
