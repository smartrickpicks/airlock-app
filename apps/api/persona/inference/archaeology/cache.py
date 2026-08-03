"""Cache layer — persist dig reports as JSON, aggregate into knowledge graph."""
from __future__ import annotations

import json
import re
from dataclasses import asdict
from datetime import datetime
from pathlib import Path

from inference.archaeology.models import (
    ArchaeologyReport, GrowthPhase, InflectionPoint, BenchmarkSpec,
)

_CACHE_DIR = Path(__file__).parent.parent.parent / "digs"
_GRAPH_FILE = _CACHE_DIR / "_knowledge_graph.json"


def _repo_slug(repo: str) -> str:
    """Convert repo URL/name to filesystem-safe slug."""
    slug = repo.replace("https://github.com/", "").replace("http://github.com/", "")
    slug = re.sub(r"[^a-zA-Z0-9_-]", "_", slug)
    return slug.strip("_").lower()


def _serial(obj: object) -> str:
    """JSON serializer for datetime objects."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Not serializable: {type(obj)}")


def save_report(report: ArchaeologyReport) -> Path:
    """Save a dig report as JSON. Returns the file path."""
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    slug = _repo_slug(report.repo)
    path = _CACHE_DIR / f"{slug}.json"
    data = asdict(report)
    path.write_text(json.dumps(data, default=_serial, indent=2))
    return path


def load_report(repo: str) -> ArchaeologyReport | None:
    """Load a cached report by repo URL/name. Returns None if not cached."""
    slug = _repo_slug(repo)
    path = _CACHE_DIR / f"{slug}.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    return _deserialize_report(data)


def list_cached() -> list[str]:
    """List all cached repo slugs."""
    if not _CACHE_DIR.exists():
        return []
    return sorted(
        p.stem for p in _CACHE_DIR.glob("*.json")
        if p.stem != "_knowledge_graph"
    )


def _deserialize_report(data: dict) -> ArchaeologyReport:
    """Reconstruct an ArchaeologyReport from JSON dict."""
    phases = []
    for p in data.get("phases", []):
        ips = [InflectionPoint(
            commit_sha=ip["commit_sha"],
            timestamp=datetime.fromisoformat(ip["timestamp"]),
            type=ip["type"],
            description=ip["description"],
            magnitude=ip["magnitude"],
            files_involved=ip["files_involved"],
        ) for ip in p.get("inflection_points", [])]
        phases.append(GrowthPhase(
            start=datetime.fromisoformat(p["start"]),
            end=datetime.fromisoformat(p["end"]),
            commits=p["commits"],
            label=p["label"],
            dominant_knowledge_source=p["dominant_knowledge_source"],
            summary=p["summary"],
            inflection_points=ips,
        ))

    inflection_points = [InflectionPoint(
        commit_sha=ip["commit_sha"],
        timestamp=datetime.fromisoformat(ip["timestamp"]),
        type=ip["type"],
        description=ip["description"],
        magnitude=ip["magnitude"],
        files_involved=ip["files_involved"],
    ) for ip in data.get("inflection_points", [])]

    benchmark_specs = [BenchmarkSpec(
        phase=bs["phase"],
        pattern=bs["pattern"],
        assertions=bs["assertions"],
        difficulty=bs["difficulty"],
        knowledge_source=bs["knowledge_source"],
        estimated_commits=bs["estimated_commits"],
    ) for bs in data.get("benchmark_specs", [])]

    return ArchaeologyReport(
        repo=data["repo"],
        total_commits=data["total_commits"],
        lifespan_days=data["lifespan_days"],
        phases=phases,
        inflection_points=inflection_points,
        ca_profile=data["ca_profile"],
        field_manual=data.get("field_manual"),
        benchmark_specs=benchmark_specs,
    )


# ── Knowledge Graph ─────────────────────────────────────────────────────────


def rebuild_knowledge_graph() -> dict:
    """Aggregate patterns across all cached digs into a knowledge graph.

    The graph contains:
    - repo_count: how many repos analyzed
    - repos: list of repo metadata summaries
    - ca_distribution: average CA profile across all repos
    - phase_label_frequency: how often each phase label appears
    - inflection_type_frequency: how often each inflection type appears
    - ks_dominant_frequency: how many repos are dominated by each KS
    - material_model: tier classification for each repo
    - learnings: extracted patterns from cross-repo analysis
    """
    slugs = list_cached()
    if not slugs:
        return {"repo_count": 0, "repos": [], "learnings": []}

    repos = []
    ca_totals = {"domain": 0.0, "normative": 0.0, "situational": 0.0,
                 "topographic": 0.0, "historical": 0.0}
    phase_labels: dict[str, int] = {}
    inflection_types: dict[str, int] = {}
    ks_dominant: dict[str, int] = {}

    for slug in slugs:
        path = _CACHE_DIR / f"{slug}.json"
        data = json.loads(path.read_text())
        report = _deserialize_report(data)

        # Determine dominant KS
        dominant_ks = max(report.ca_profile, key=report.ca_profile.get)

        # Material model tier
        tier = classify_material_tier(report)

        repos.append({
            "slug": slug,
            "repo": report.repo,
            "total_commits": report.total_commits,
            "lifespan_days": report.lifespan_days,
            "phases": len(report.phases),
            "inflection_points": len(report.inflection_points),
            "dominant_ks": dominant_ks,
            "ca_profile": report.ca_profile,
            "material_tier": tier,
        })

        # Aggregate CA
        for ks, val in report.ca_profile.items():
            ca_totals[ks] += val

        # Phase labels
        for phase in report.phases:
            phase_labels[phase.label] = phase_labels.get(phase.label, 0) + 1

        # Inflection types
        for ip in report.inflection_points:
            inflection_types[ip.type] = inflection_types.get(ip.type, 0) + 1

        # KS dominance
        ks_dominant[dominant_ks] = ks_dominant.get(dominant_ks, 0) + 1

    n = len(repos)
    ca_avg = {ks: ca_totals[ks] / n for ks in ca_totals}

    # Extract learnings
    learnings = _extract_learnings(repos, ca_avg, phase_labels, inflection_types)

    graph = {
        "repo_count": n,
        "last_updated": datetime.now().isoformat(),
        "repos": repos,
        "ca_distribution_avg": ca_avg,
        "phase_label_frequency": phase_labels,
        "inflection_type_frequency": inflection_types,
        "ks_dominant_frequency": ks_dominant,
        "learnings": learnings,
    }

    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    _GRAPH_FILE.write_text(json.dumps(graph, indent=2))
    return graph


def load_knowledge_graph() -> dict | None:
    """Load the knowledge graph from disk."""
    if not _GRAPH_FILE.exists():
        return None
    return json.loads(_GRAPH_FILE.read_text())


# ── Material Model Classification ───────────────────────────────────────────


def classify_material_tier(report: ArchaeologyReport) -> str:
    """Classify a repo into a Material Model tier based on CA profile.

    Tiers:
    - luxury: high governance (normative >= 0.3), multi-KS diversity, slow deliberate growth
    - premium: balanced CA profile OR mature fix-driven (situational dominant with governance)
    - standard: single-KS dominant (usually domain), some governance present
    - free: single phase or near-single KS with zero governance
    """
    ca = report.ca_profile
    normative = ca.get("normative", 0)
    situational = ca.get("situational", 0)
    domain = ca.get("domain", 0)
    historical = ca.get("historical", 0)

    # Count how many KS have meaningful presence (>= 5%)
    active_ks = sum(1 for v in ca.values() if v >= 0.05)

    # Governance score: normative weight + bonus for historical (rewrites show reflection)
    governance = normative + (historical * 0.5)

    # Diversity score: more active KS = more mature
    diversity = active_ks / 5.0

    # Free: too small, single phase, or zero governance with single KS
    if report.total_commits < 20 or len(report.phases) <= 2:
        return "free"
    if governance < 0.02 and active_ks <= 1:
        return "free"

    # Luxury: governance-heavy + diverse KS profile
    if governance >= 0.25 and active_ks >= 3:
        return "luxury"
    if normative >= 0.40:
        return "luxury"

    # Premium: either diverse profile or mature fix-driven
    if active_ks >= 3:
        return "premium"
    if situational >= 0.40 and normative >= 0.03:
        return "premium"
    if governance >= 0.08:
        return "premium"

    # Standard: everything else with some substance
    return "standard"


# ── Cross-Repo Learnings ────────────────────────────────────────────────────


def _extract_learnings(
    repos: list[dict],
    ca_avg: dict[str, float],
    phase_labels: dict[str, int],
    inflection_types: dict[str, int],
) -> list[str]:
    """Extract human-readable insights from aggregate data."""
    learnings = []

    # Most common dominant KS
    ks_counts: dict[str, int] = {}
    for r in repos:
        ks_counts[r["dominant_ks"]] = ks_counts.get(r["dominant_ks"], 0) + 1
    if ks_counts:
        top_ks = max(ks_counts, key=ks_counts.get)
        learnings.append(
            f"Most repos are {top_ks}-dominant ({ks_counts[top_ks]}/{len(repos)}). "
            f"This suggests most open-source development is {top_ks}-driven."
        )

    # Governance gap
    low_gov = [r for r in repos if r["ca_profile"].get("normative", 0) < 0.05]
    if low_gov:
        learnings.append(
            f"{len(low_gov)}/{len(repos)} repos have <5% normative signal — "
            f"governance is underrepresented in most projects."
        )

    # Exploration gap
    low_topo = [r for r in repos if r["ca_profile"].get("topographic", 0) < 0.01]
    if low_topo:
        learnings.append(
            f"{len(low_topo)}/{len(repos)} repos show near-zero topographic signal — "
            f"exploration/experimentation is invisible in commit history."
        )

    # Refactors are the most common inflection
    if inflection_types:
        top_inf = max(inflection_types, key=inflection_types.get)
        learnings.append(
            f"Most common inflection type: {top_inf} ({inflection_types[top_inf]} detected). "
            f"{'Refactoring is the primary growth mechanism.' if top_inf == 'refactor' else ''}"
        )

    # Material tier distribution
    tiers: dict[str, int] = {}
    for r in repos:
        t = r.get("material_tier", "unknown")
        tiers[t] = tiers.get(t, 0) + 1
    if tiers:
        tier_summary = ", ".join(f"{t}: {c}" for t, c in sorted(tiers.items()))
        learnings.append(f"Material Model distribution: {tier_summary}")

    return learnings
