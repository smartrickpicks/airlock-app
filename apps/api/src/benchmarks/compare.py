"""Compare two ConstellationBench runs side by side."""

from __future__ import annotations

import json
import sys
from pathlib import Path

RESULTS_DIR = Path(__file__).parent / "results"


def load_report(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def compare(report_a: dict, report_b: dict) -> None:
    """Print side-by-side comparison of two benchmark reports."""
    print("\n" + "=" * 80)
    print(f"  COMPARISON: {report_a['run_id']} vs {report_b['run_id']}")
    print("=" * 80)

    all_tiers = sorted(
        set(list(report_a.get("summary", {}).keys()) + list(report_b.get("summary", {}).keys()))
    )

    print(
        f"\n{'Tier':<18} {'Score A':>9} {'Score B':>9} {'Delta':>8} {'Cost A':>10} {'Cost B':>10} {'Cost Delta':>11}"
    )
    print("-" * 80)

    for tier in all_tiers:
        a = report_a.get("summary", {}).get(tier, {})
        b = report_b.get("summary", {}).get(tier, {})
        score_a = a.get("avg_score", 0)
        score_b = b.get("avg_score", 0)
        cost_a = a.get("avg_cost_usd", 0)
        cost_b = b.get("avg_cost_usd", 0)
        delta_score = score_b - score_a
        delta_cost = cost_b - cost_a

        indicator = "+" if delta_score > 0.01 else ("-" if delta_score < -0.01 else "=")

        print(
            f"{tier:<18} {score_a:>9.3f} {score_b:>9.3f} {indicator}{abs(delta_score):>6.3f} "
            f"${cost_a:>9.4f} ${cost_b:>9.4f} ${delta_cost:>+10.4f}"
        )

    print("=" * 80)


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python -m src.benchmarks.compare <run_id_a> <run_id_b>")
        print("\nAvailable runs:")
        for p in sorted(RESULTS_DIR.glob("bench-*.json")):
            print(f"  {p.stem.replace('bench-', '')}")
        sys.exit(1)

    path_a = RESULTS_DIR / f"bench-{sys.argv[1]}.json"
    path_b = RESULTS_DIR / f"bench-{sys.argv[2]}.json"

    if not path_a.exists():
        print(f"ERROR: {path_a} not found")
        sys.exit(1)
    if not path_b.exists():
        print(f"ERROR: {path_b} not found")
        sys.exit(1)

    compare(load_report(path_a), load_report(path_b))


if __name__ == "__main__":
    main()
