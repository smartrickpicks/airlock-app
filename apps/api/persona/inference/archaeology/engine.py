"""Engine — orchestrates ingest + analysis into a complete ArchaeologyReport."""
from __future__ import annotations

from inference.archaeology.models import ArchaeologyReport
from inference.archaeology.ingest import clone_and_log, parse_git_log
from inference.archaeology.analysis import detect_inflections, segment_phases, generate_benchmarks
from inference.archaeology.cache import save_report, load_report


def analyze_repo(
    repo_url: str,
    repo_path: str | None = None,
    use_cache: bool = True,
) -> ArchaeologyReport:
    """Full archaeology pipeline: clone -> parse -> detect -> segment -> report.

    Results are cached in digs/ — subsequent calls return the cached report
    unless use_cache=False.
    """
    if use_cache and not repo_path:
        cached = load_report(repo_url)
        if cached is not None:
            return cached

    raw_log = clone_and_log(repo_url, repo_path=repo_path)
    commits = parse_git_log(raw_log)

    if not commits:
        return ArchaeologyReport(
            repo=repo_url,
            total_commits=0,
            lifespan_days=0,
            phases=[],
            inflection_points=[],
            ca_profile={ks: 0.2 for ks in ["domain", "normative", "situational", "topographic", "historical"]},
            field_manual=None,
            benchmark_specs=[],
        )

    inflection_points = detect_inflections(commits)
    phases = segment_phases(commits, inflection_points)

    ks_names = ["domain", "normative", "situational", "topographic", "historical"]
    ca_counts = {ks: 0 for ks in ks_names}
    for phase in phases:
        ca_counts[phase.dominant_knowledge_source] += phase.commits
    total = sum(ca_counts.values()) or 1
    ca_profile = {ks: ca_counts[ks] / total for ks in ks_names}

    lifespan = (commits[-1].timestamp - commits[0].timestamp).days

    report = ArchaeologyReport(
        repo=repo_url,
        total_commits=len(commits),
        lifespan_days=lifespan,
        phases=phases,
        inflection_points=inflection_points,
        ca_profile=ca_profile,
        field_manual=None,
        benchmark_specs=generate_benchmarks(phases),
    )

    # Cache the report (skip local-path-only digs)
    if not repo_path:
        save_report(report)

    return report
