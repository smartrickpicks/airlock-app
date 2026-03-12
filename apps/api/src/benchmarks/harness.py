"""ConstellationBench harness — CLI entry point for running benchmark suites."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path

from src.benchmarks.config import MODEL_TIERS, ModelTier
from src.benchmarks.corpus import CORPUS, BenchmarkQuery
from src.benchmarks.models import BenchmarkReport, CouncilRunResult, DECFProfile
from src.benchmarks.runner import CouncilRunner
from src.benchmarks.scorer import Scorer

logger = logging.getLogger(__name__)

RESULTS_DIR = Path(__file__).parent / "results"


async def run_benchmark(
    queries: list[BenchmarkQuery],
    tiers: list[ModelTier],
    api_key: str,
    concurrency: int = 2,
) -> BenchmarkReport:
    """Run the full benchmark suite: all queries x all model tiers."""
    run_id = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    report = BenchmarkReport(
        run_id=run_id,
        started_at=datetime.now(UTC).isoformat(),
        query_count=len(queries),
        model_tiers=[t.name for t in tiers],
    )

    runner = CouncilRunner(api_key=api_key)
    scorer = Scorer()
    semaphore = asyncio.Semaphore(concurrency)

    async def run_one(query: BenchmarkQuery, tier: ModelTier) -> CouncilRunResult:
        async with semaphore:
            logger.info("Running %s on %s...", query.id, tier.name)
            result = await runner.run_council(query, tier)

            if result.perspectives and not result.errors:
                profiles = []
                for p in result.perspectives:
                    cached = runner._profiles_cache.get(p.persona, {})
                    drives = cached.get("drives", {})
                    profiles.append(
                        DECFProfile(
                            persona_id=p.persona,
                            dominance=drives.get("dominance", 5),
                            extraversion=drives.get("extraversion", 5),
                            patience=drives.get("patience", 5),
                            formality=drives.get("formality", 5),
                        )
                    )
                result.scores = scorer.score_council_run(
                    result.perspectives,
                    profiles,
                    query.expected_themes,
                )
                result.aggregate_score = (
                    sum(s.weighted_total for s in result.scores.values()) / len(result.scores)
                    if result.scores
                    else 0.0
                )

            logger.info(
                "  %s x %s -> score=%.3f cost=$%.4f latency=%dms",
                query.id,
                tier.name,
                result.aggregate_score,
                result.total_cost_usd,
                result.total_latency_ms,
            )
            return result

    tasks = [run_one(q, t) for q in queries for t in tiers]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for r in results:
        if isinstance(r, Exception):
            logger.error("Benchmark task failed: %s", r)
            report.results.append(
                CouncilRunResult(
                    query_id="error",
                    query_text="",
                    command="",
                    model_tier="",
                    model_id="",
                    errors=[str(r)],
                )
            )
        else:
            report.results.append(r)

    report.completed_at = datetime.now(UTC).isoformat()

    for tier in tiers:
        tier_results = [r for r in report.results if r.model_tier == tier.name and not r.errors]
        if not tier_results:
            continue
        report.summary[tier.name] = {
            "avg_score": round(sum(r.aggregate_score for r in tier_results) / len(tier_results), 3),
            "avg_cost_usd": round(
                sum(r.total_cost_usd for r in tier_results) / len(tier_results), 4
            ),
            "avg_latency_ms": round(
                sum(r.total_latency_ms for r in tier_results) / len(tier_results)
            ),
            "total_cost_usd": round(sum(r.total_cost_usd for r in tier_results), 4),
            "json_compliance_rate": round(
                sum(1 for r in tier_results for p in r.perspectives if p.json_valid)
                / max(sum(len(r.perspectives) for r in tier_results), 1),
                3,
            ),
            "query_count": len(tier_results),
        }

    return report


def save_report(report: BenchmarkReport) -> Path:
    """Save benchmark report as JSON."""
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = RESULTS_DIR / f"bench-{report.run_id}.json"
    with open(path, "w") as f:
        json.dump(asdict(report), f, indent=2, default=str)
    return path


def print_summary(report: BenchmarkReport) -> None:
    """Print a human-readable summary table."""
    print("\n" + "=" * 72)
    print(f"  CONSTELLATIONBENCH RESULTS — Run {report.run_id}")
    print(f"  Queries: {report.query_count} | Tiers: {len(report.model_tiers)}")
    print(f"  Duration: {report.started_at} -> {report.completed_at}")
    print("=" * 72)
    print(f"\n{'Tier':<20} {'Score':>8} {'Cost/Run':>10} {'Latency':>10} {'JSON%':>8} {'Runs':>6}")
    print("-" * 72)
    for tier_name, stats in sorted(report.summary.items(), key=lambda x: -x[1]["avg_score"]):
        print(
            f"{tier_name:<20} {stats['avg_score']:>8.3f} "
            f"${stats['avg_cost_usd']:>9.4f} "
            f"{stats['avg_latency_ms']:>8d}ms "
            f"{stats['json_compliance_rate']:>7.1%} "
            f"{stats['query_count']:>6d}"
        )
    print("=" * 72)


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="ConstellationBench — multi-model benchmark harness"
    )
    parser.add_argument("--tiers", nargs="*", help="Model tier names to test (default: all)")
    parser.add_argument("--commands", nargs="*", help="Council types to test (default: all)")
    parser.add_argument(
        "--difficulty", choices=["easy", "medium", "hard"], help="Filter by difficulty"
    )
    parser.add_argument("--queries", nargs="*", help="Specific query IDs to run")
    parser.add_argument("--concurrency", type=int, default=2, help="Max concurrent LLM calls")
    parser.add_argument(
        "--dry-run", action="store_true", help="Print what would run without calling LLMs"
    )
    parser.add_argument(
        "--quick", action="store_true", help="Quick test: 3 queries x 2 cheapest tiers"
    )
    parser.add_argument(
        "--deep", metavar="QUERY_ID", help="Deep test: single query across ALL tiers"
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    # Resolve API key
    api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key and not args.dry_run:
        print("ERROR: Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY environment variable.")
        sys.exit(1)

    # Filter model tiers
    tiers = list(MODEL_TIERS)
    if args.tiers:
        tiers = [t for t in MODEL_TIERS if t.name in args.tiers]
        if not tiers:
            print(f"ERROR: No matching tiers. Available: {[t.name for t in MODEL_TIERS]}")
            sys.exit(1)

    # Filter queries
    queries = list(CORPUS)
    if args.commands:
        queries = [q for q in queries if q.command in args.commands]
    if args.difficulty:
        queries = [q for q in queries if q.difficulty == args.difficulty]
    if args.queries:
        queries = [q for q in queries if q.id in args.queries]

    # Quick mode: 3 queries x 2 cheapest tiers
    if args.quick:
        queries = [CORPUS[0], CORPUS[8], CORPUS[22]]  # 1 discover, 1 build, 1 ship
        tiers = [t for t in MODEL_TIERS if t.name in ("haiku-4.5", "sonnet-4.6")]

    # Deep mode: single query across ALL tiers
    if args.deep:
        queries = [q for q in CORPUS if q.id == args.deep]
        if not queries:
            print(f"ERROR: Query '{args.deep}' not found.")
            sys.exit(1)
        tiers = list(MODEL_TIERS)

    if not queries:
        print("ERROR: No queries match the filters.")
        sys.exit(1)

    # Dry run
    if args.dry_run:
        print(
            f"Would run {len(queries)} queries x {len(tiers)} tiers = {len(queries) * len(tiers)} council runs"
        )
        print(f"Tiers: {[t.name for t in tiers]}")
        print(f"Queries: {[q.id for q in queries]}")
        est_calls = len(queries) * len(tiers) * 4  # 4 personas per council
        print(f"Estimated LLM calls: {est_calls}")
        return

    # Run benchmark
    print(
        f"Running {len(queries)} queries x {len(tiers)} tiers ({len(queries) * len(tiers)} council runs)..."
    )
    report = asyncio.run(run_benchmark(queries, tiers, api_key, args.concurrency))

    # Save and print
    path = save_report(report)
    print_summary(report)
    print(f"\nFull results saved to: {path}")


if __name__ == "__main__":
    main()
