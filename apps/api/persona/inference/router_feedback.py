"""Router Feedback — Learn model weights from benchmark results.

Ingests PinchBench / Dharma Circuit / RYS benchmark results and builds
a scoring table that the DharmaRouter can query at route-time.

The feedback loop:
    1. Run a benchmark → results land in benchmarks/ as YAML
    2. Call update_from_benchmark() or update_from_all_benchmarks()
    3. Learned weights persist to inference/router-weights.json
    4. DharmaRouter checks get_adjusted_weights() before static config

Usage:
    from inference.router_feedback import get_adjusted_weights, update_from_all_benchmarks

    # Ingest all benchmark results
    update_from_all_benchmarks()

    # Query at route-time
    weights = get_adjusted_weights("casual_chat")
    # → {"deepseek-v3": 0.62, "grok-3-mini": 0.55, ...}
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger(__name__)

WEIGHTS_PATH = Path(__file__).parent / "router-weights.json"
BENCHMARKS_DIR = Path(__file__).parent.parent / "benchmarks"

# Maps composite route intents to the dharma layers that matter for them.
# Mirrors composite_routes in dharma-router.yaml.
INTENT_LAYER_MAP: dict[str, list[str]] = {
    "casual_chat": ["l1", "l6"],
    "deep_conversation": ["l2", "l3", "l5"],
    "first_impression": ["l1", "l4"],
    "crisis_moment": ["l2", "l3", "l5"],
    "team_dynamics": ["l5", "l2", "l4"],
    "canonical_otto": ["l1", "l2", "l6"],
    "image_generation": ["image_gen"],
    "aegis_recon": ["l1", "l4"],
    "aegis_live_coach": ["l2", "l5"],
    "aegis_comms_relay": ["l1", "l6"],
    "aegis_ambient": ["l6"],
}

# ── Leaderboard field names → canonical dimension keys ────────────────
# Different benchmark files use different field names. Map them all to
# a consistent set of dimension keys so scores can be compared.
FIELD_ALIASES: dict[str, str] = {
    # Dharma Circuit leaderboard fields
    "dharma_score": "dharma_overall",
    "l1_best_fidelity": "l1",
    "l1_control_fidelity": "l1_control",
    "l2_dual_valence": "l2",
    "l3_growth_arc": "l3",
    "l4_hawthorne_buff": "l4_hawthorne",
    "l4_pygmalion_buff": "l4_pygmalion",
    "l5_ubuntu_delta": "l5",
    "l6_center_alignment": "l6",
    # Zen layers (from dharma-router.yaml, manually keyed)
    "l7_shoshin": "l7",
    "l8_koan": "l8",
    "l9_mu": "l9",
    "l10_maat": "l10",
    # RYS leaderboard fields
    "rys_score": "rys_overall",
    "cognitive_fidelity": "cognitive",
    "emotional_fidelity": "emotional",
    "persona_separation": "separation",
    "circuit_consistency": "consistency",
    # Generic
    "avg_fidelity": "fidelity",
    "score": "score",
    # Image gen
    "image_quality": "image_gen",
}


def _load_weights() -> dict[str, Any]:
    """Load persisted weights from disk, or return empty structure."""
    if WEIGHTS_PATH.exists():
        try:
            with open(WEIGHTS_PATH) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("Failed to load router weights: %s", e)
    return {"model_scores": {}, "intent_winners": {}, "source_files": []}


def _save_weights(data: dict[str, Any]) -> None:
    """Persist weights to disk."""
    try:
        with open(WEIGHTS_PATH, "w") as f:
            json.dump(data, f, indent=2, sort_keys=True)
        logger.info("Saved router weights to %s", WEIGHTS_PATH)
    except OSError as e:
        logger.error("Failed to save router weights: %s", e)


def _extract_model_scores(raw: dict) -> dict[str, dict[str, float]]:
    """Extract model → {dimension: score} from a benchmark YAML structure.

    Handles multiple formats:
    - Flat dict of model → {field: value} (dharma-circuit-leaderboard, rys-leaderboard)
    - Nested under a 'leaderboard' key (moe-leaderboard)
    - Triple-crown format with 'benchmarks' key
    """
    scores: dict[str, dict[str, float]] = {}

    # Unwrap if nested under 'leaderboard'
    if "leaderboard" in raw and isinstance(raw["leaderboard"], dict):
        raw = raw["leaderboard"]

    # Skip non-model-keyed structures (like triple-crown benchmarks key)
    if "benchmarks" in raw and "run_id" in raw:
        # Triple-crown format — scores are per-benchmark, not per-dimension
        benchmarks = raw.get("benchmarks", {})
        for bench_name, bench_scores in benchmarks.items():
            if not isinstance(bench_scores, dict):
                continue
            for model, score in bench_scores.items():
                if model == "airlock_constellation":
                    continue
                if not isinstance(score, (int, float)):
                    continue
                model_key = model.replace("_", "-")
                scores.setdefault(model_key, {})[bench_name] = float(score)
        return scores

    # Standard format: top-level keys are model names
    for model, fields in raw.items():
        if not isinstance(fields, dict):
            continue
        # Skip metadata keys
        if model in ("version", "name", "codename", "cost_analysis",
                      "relay_implications", "varuna", "timestamp",
                      "total_cost", "persona_breakdown", "date",
                      "run_id", "mode", "cost"):
            continue

        model_scores: dict[str, float] = {}
        for field, value in fields.items():
            if not isinstance(value, (int, float)):
                continue
            # Skip non-score fields
            if field in ("total_cost", "cost_efficiency", "n_calls",
                         "avg_latency_ms", "calls", "cost_adjusted_quality",
                         "min_fidelity", "max_fidelity", "avg_cost_per_call"):
                continue

            canonical = FIELD_ALIASES.get(field, field)
            model_scores[canonical] = float(value)

        if model_scores:
            scores[model] = model_scores

    return scores


def _compute_l4_combined(model_scores: dict[str, float]) -> None:
    """Compute combined L4 score from Hawthorne + Pygmalion components."""
    h = model_scores.get("l4_hawthorne")
    p = model_scores.get("l4_pygmalion")
    if h is not None and p is not None:
        model_scores["l4"] = h + p


def _compute_intent_winners(
    model_scores: dict[str, dict[str, float]],
) -> dict[str, dict[str, float]]:
    """For each intent, compute weighted model scores across relevant layers.

    Returns intent → {model: weighted_score}.
    """
    intent_winners: dict[str, dict[str, float]] = {}

    for intent, layers in INTENT_LAYER_MAP.items():
        model_totals: dict[str, float] = {}
        model_counts: dict[str, int] = {}

        for model, dims in model_scores.items():
            total = 0.0
            count = 0
            for layer in layers:
                if layer in dims:
                    total += dims[layer]
                    count += 1
            if count > 0:
                model_totals[model] = total / count
                model_counts[model] = count

        if model_totals:
            intent_winners[intent] = model_totals

    return intent_winners


def update_from_benchmark(results_path: str) -> dict[str, dict[str, float]]:
    """Ingest a single benchmark results file and update learned weights.

    Args:
        results_path: Path to a YAML benchmark results file.

    Returns:
        The updated intent_winners dict.
    """
    path = Path(results_path)
    if not path.exists():
        raise FileNotFoundError(f"Benchmark file not found: {path}")

    with open(path) as f:
        raw = yaml.safe_load(f)

    if not raw or not isinstance(raw, dict):
        logger.warning("Empty or invalid benchmark file: %s", path)
        return {}

    new_scores = _extract_model_scores(raw)

    # Compute combined L4 for each model
    for dims in new_scores.values():
        _compute_l4_combined(dims)

    # Merge into existing weights
    data = _load_weights()
    existing = data.get("model_scores", {})

    for model, dims in new_scores.items():
        if model not in existing:
            existing[model] = {}
        # New scores override old ones for the same dimension
        existing[model].update(dims)

    data["model_scores"] = existing
    data["intent_winners"] = _compute_intent_winners(existing)

    # Track source files
    source = str(path)
    sources = data.get("source_files", [])
    if source not in sources:
        sources.append(source)
    data["source_files"] = sources

    _save_weights(data)
    return data["intent_winners"]


def update_from_all_benchmarks(
    benchmarks_dir: str | Path | None = None,
) -> dict[str, dict[str, float]]:
    """Scan benchmarks/ directory and ingest all YAML results files.

    Args:
        benchmarks_dir: Override the default benchmarks directory.

    Returns:
        The updated intent_winners dict.
    """
    bdir = Path(benchmarks_dir) if benchmarks_dir else BENCHMARKS_DIR
    if not bdir.exists():
        logger.warning("Benchmarks directory not found: %s", bdir)
        return {}

    # Reset weights for a clean rebuild
    data: dict[str, Any] = {"model_scores": {}, "intent_winners": {}, "source_files": []}
    _save_weights(data)

    yaml_files = sorted(bdir.rglob("*.yaml"))
    ingested = 0

    for yf in yaml_files:
        # Skip non-results files (task definitions, designs, etc.)
        name = yf.stem.lower()
        if any(skip in name for skip in ("tasks", "design", "profiles", "rubric")):
            continue

        try:
            update_from_benchmark(str(yf))
            ingested += 1
        except Exception as e:
            logger.warning("Skipped %s: %s", yf.name, e)

    logger.info("Ingested %d benchmark files from %s", ingested, bdir)

    return _load_weights().get("intent_winners", {})


def get_adjusted_weights(intent: str) -> dict[str, float] | None:
    """Get learned model weights for a given intent.

    Args:
        intent: A composite route name (e.g. "casual_chat", "crisis_moment").

    Returns:
        Dict of model → score for this intent, or None if no learned data.
        Higher score = better model for this intent.
    """
    data = _load_weights()
    winners = data.get("intent_winners", {})
    result = winners.get(intent)
    if not result:
        return None
    return result


def get_best_model(intent: str) -> str | None:
    """Get the single best model for an intent based on learned weights.

    Returns:
        Model name string, or None if no learned data.
    """
    weights = get_adjusted_weights(intent)
    if not weights:
        return None
    return max(weights, key=weights.get)  # type: ignore[arg-type]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    print("=== Router Feedback — Ingesting Benchmarks ===\n")
    winners = update_from_all_benchmarks()

    print(f"\nIngested. {len(winners)} intents have learned weights.\n")

    for intent, models in sorted(winners.items()):
        best = max(models, key=models.get)  # type: ignore[arg-type]
        print(f"  {intent:25s} → {best:18s} (score: {models[best]:.4f})")
        # Show top 3
        ranked = sorted(models.items(), key=lambda x: x[1], reverse=True)
        for model, score in ranked[:3]:
            print(f"    {model:25s} {score:.4f}")
