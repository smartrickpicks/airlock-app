"""CLI entry point: python -m inference.archaeology <repo-url>"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from datetime import datetime

from inference.archaeology.engine import analyze_repo
from inference.archaeology.cache import (
    list_cached, load_report, rebuild_knowledge_graph, classify_material_tier,
)


def _json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


_KS_LABELS = {
    "domain": "Domain (Analytical)",
    "normative": "Normative (Organized)",
    "situational": "Situational (Experiential)",
    "topographic": "Topographic (Imaginative)",
    "historical": "Historical (Temporal)",
}


def _print_report(report):
    """Print a human-readable summary of an archaeology report."""
    tier = classify_material_tier(report)
    print(f"Repository: {report.repo}")
    print(f"Commits: {report.total_commits}")
    print(f"Lifespan: {report.lifespan_days} days")
    print(f"Phases: {len(report.phases)}")
    print(f"Inflection points: {len(report.inflection_points)}")
    print(f"Material tier: {tier.upper()}")
    print()
    print("CA Profile:")
    for ks, weight in sorted(report.ca_profile.items(), key=lambda x: x[1], reverse=True):
        bar = "\u2588" * int(weight * 50)
        print(f"  {_KS_LABELS.get(ks, ks):30s} {weight:.3f} {bar}")
    print()
    for i, phase in enumerate(report.phases):
        ips = f" ({len(phase.inflection_points)} inflection{'s' if len(phase.inflection_points) != 1 else ''})" if phase.inflection_points else ""
        print(f"Phase {i+1}: {phase.label} [{phase.dominant_knowledge_source}] -- {phase.commits} commits{ips}")
        print(f"  {phase.start.strftime('%Y-%m-%d')} to {phase.end.strftime('%Y-%m-%d')}")
        print(f"  {phase.summary[:120]}")
        print()


def cmd_dig(args):
    """Run archaeology on a repo."""
    repo_url = args.repo
    if "/" in repo_url and not repo_url.startswith("http") and repo_url != "local":
        repo_url = f"https://github.com/{repo_url}"

    repo_path = args.path if args.repo == "local" else None
    use_cache = not args.no_cache

    report = analyze_repo(repo_url, repo_path=repo_path, use_cache=use_cache)

    if args.format == "json":
        print(json.dumps(asdict(report), indent=2, default=_json_serial))
    else:
        _print_report(report)


def cmd_graph(args):
    """Rebuild and display the knowledge graph."""
    graph = rebuild_knowledge_graph()
    if graph["repo_count"] == 0:
        print("No cached digs. Run some digs first.")
        return

    print(f"Knowledge Graph — {graph['repo_count']} repos analyzed")
    print(f"Last updated: {graph['last_updated']}")
    print()

    # Repo summary table
    print(f"{'Repo':<45} {'Commits':>7} {'Phases':>6} {'Dominant KS':<14} {'Tier':<8}")
    print("-" * 85)
    for r in sorted(graph["repos"], key=lambda x: x["total_commits"], reverse=True):
        name = r["repo"].replace("https://github.com/", "")[:44]
        print(f"{name:<45} {r['total_commits']:>7} {r['phases']:>6} {r['dominant_ks']:<14} {r['material_tier']:<8}")
    print()

    # Average CA distribution
    print("Average CA Distribution:")
    for ks, val in sorted(graph["ca_distribution_avg"].items(), key=lambda x: x[1], reverse=True):
        bar = "\u2588" * int(val * 50)
        print(f"  {_KS_LABELS.get(ks, ks):30s} {val:.3f} {bar}")
    print()

    # Learnings
    if graph.get("learnings"):
        print("Learnings:")
        for i, learning in enumerate(graph["learnings"], 1):
            print(f"  {i}. {learning}")
        print()

    if args.format == "json":
        print(json.dumps(graph, indent=2))


def cmd_list(args):
    """List all cached digs."""
    cached = list_cached()
    if not cached:
        print("No cached digs.")
        return
    print(f"{len(cached)} cached digs:")
    for slug in cached:
        print(f"  {slug}")


def main():
    parser = argparse.ArgumentParser(
        description="Software Archaeology — git history to growth timelines to Cultural Algorithm mapping"
    )
    subparsers = parser.add_subparsers(dest="command")

    # Dig command (default for backwards compat)
    dig_parser = subparsers.add_parser("dig", help="Analyze a repository")
    dig_parser.add_argument("repo", help="GitHub URL (owner/repo or full URL) or 'local'")
    dig_parser.add_argument("--path", help="Local filesystem path (when repo is 'local')")
    dig_parser.add_argument("--format", choices=["json", "summary"], default="summary")
    dig_parser.add_argument("--focus", help="Optional focus hint")
    dig_parser.add_argument("--no-cache", action="store_true", help="Skip cache, re-analyze")

    # Graph command
    graph_parser = subparsers.add_parser("graph", help="Show knowledge graph")
    graph_parser.add_argument("--format", choices=["json", "summary"], default="summary")

    # List command
    subparsers.add_parser("list", help="List cached digs")

    # Backwards compat: if first arg isn't a known subcommand, treat as dig
    known_commands = {"dig", "graph", "list", "--help", "-h"}
    argv = sys.argv[1:]
    if argv and argv[0] not in known_commands:
        argv = ["dig"] + argv

    args = parser.parse_args(argv)

    if args.command == "graph":
        cmd_graph(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "dig":
        cmd_dig(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
