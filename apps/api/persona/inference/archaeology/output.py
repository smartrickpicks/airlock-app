"""Output rendering — narrative reports, HTML dashboards, field manuals."""
from __future__ import annotations

from inference.archaeology.models import ArchaeologyReport

_KS_LABELS = {
    "domain": "Domain (Analytical)",
    "normative": "Normative (Organized)",
    "situational": "Situational (Experiential)",
    "topographic": "Topographic (Imaginative)",
    "historical": "Historical (Temporal)",
}

_KS_DESCRIPTIONS = {
    "domain": "pure feature work, system modeling, API design",
    "normative": "governance, testing infrastructure, CI/CD, contribution guidelines",
    "situational": "bug fixes, incident response, hotfix patterns",
    "topographic": "exploration, prototyping, experimental branches",
    "historical": "rewrites, migrations, architectural reflection",
}


def render_narrative(report: ArchaeologyReport) -> str:
    repo_name = report.repo.split("/")[-1] if "/" in report.repo else report.repo

    lines = [
        f"# Archaeological Analysis: {report.repo}",
        "",
        f"{repo_name}'s development spans {report.lifespan_days} days across "
        f"{report.total_commits} commits, exhibiting {len(report.phases)} distinct growth phases.",
        "",
    ]

    sorted_ks = sorted(report.ca_profile.items(), key=lambda x: x[1], reverse=True)
    dominant = sorted_ks[0]
    lines.append(
        f"The project's overall cognitive profile is {_KS_LABELS[dominant[0]]}-dominant "
        f"({dominant[1]:.0%} of development), indicating a primary focus on "
        f"{_KS_DESCRIPTIONS[dominant[0]]}."
    )
    lines.append("")

    lines.append("## Growth Phases")
    lines.append("")

    for i, phase in enumerate(report.phases):
        ks_label = _KS_LABELS.get(phase.dominant_knowledge_source, phase.dominant_knowledge_source)
        lines.append(
            f"### Phase {i + 1}: {phase.label.replace('_', ' ').title()} "
            f"({phase.start.strftime('%b %Y')} — {phase.end.strftime('%b %Y')})"
        )
        lines.append("")
        lines.append(f"**{phase.commits} commits** | **{ks_label}**-dominant")
        lines.append("")
        lines.append(phase.summary)
        lines.append("")

        if phase.inflection_points:
            lines.append(f"Inflection points detected: {len(phase.inflection_points)}")
            for ip in phase.inflection_points:
                lines.append(f"- [{ip.type}] {ip.description} (magnitude: {ip.magnitude:.2f})")
            lines.append("")

    if report.inflection_points:
        lines.append("## Key Inflection Points")
        lines.append("")
        for ip in report.inflection_points:
            lines.append(f"- **{ip.timestamp.strftime('%Y-%m-%d')}** [{ip.type}]: {ip.description}")
        lines.append("")

    return "\n".join(lines)


def render_html(report: ArchaeologyReport) -> str:
    repo_name = report.repo.split("/")[-1] if "/" in report.repo else report.repo

    phase_rows = ""
    ks_colors = {
        "domain": "#4A90D9",
        "normative": "#7B68EE",
        "situational": "#E8A838",
        "topographic": "#50C878",
        "historical": "#DC143C",
    }

    for i, phase in enumerate(report.phases):
        color = ks_colors.get(phase.dominant_knowledge_source, "#888")
        width_pct = (phase.commits / max(report.total_commits, 1)) * 100
        ip_count = len(phase.inflection_points)
        ip_badge = f' <span class="badge">{ip_count} inflection{"s" if ip_count != 1 else ""}</span>' if ip_count else ""

        phase_rows += f"""
        <div class="phase" style="border-left: 4px solid {color};">
            <div class="phase-header">
                <span class="phase-label">Phase {i + 1}: {phase.label.replace("_", " ").title()}</span>
                <span class="phase-ks" style="color: {color};">{_KS_LABELS.get(phase.dominant_knowledge_source, "")}</span>
            </div>
            <div class="phase-bar" style="width: {width_pct}%; background: {color};"></div>
            <div class="phase-meta">
                {phase.commits} commits &middot; {phase.start.strftime("%b %Y")} — {phase.end.strftime("%b %Y")}{ip_badge}
            </div>
            <div class="phase-summary">{phase.summary[:200]}</div>
        </div>"""

    ca_bars = ""
    sorted_ca = sorted(report.ca_profile.items(), key=lambda x: x[1], reverse=True)
    for ks, weight in sorted_ca:
        color = ks_colors.get(ks, "#888")
        ca_bars += f"""
        <div class="ca-row">
            <span class="ca-label">{_KS_LABELS.get(ks, ks)}</span>
            <div class="ca-bar-track">
                <div class="ca-bar-fill" style="width: {weight * 100}%; background: {color};"></div>
            </div>
            <span class="ca-value">{weight:.0%}</span>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Archaeology: {repo_name}</title>
<style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 2rem; max-width: 900px; margin: 0 auto; }}
    h1 {{ font-size: 1.8rem; margin-bottom: 0.5rem; }}
    h2 {{ font-size: 1.3rem; margin: 2rem 0 1rem; color: #aaa; text-transform: uppercase; letter-spacing: 0.1em; }}
    .meta {{ color: #888; margin-bottom: 2rem; }}
    .phase {{ padding: 1rem; margin-bottom: 1rem; background: #141414; border-radius: 8px; }}
    .phase-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }}
    .phase-label {{ font-weight: 600; font-size: 1.1rem; }}
    .phase-ks {{ font-size: 0.85rem; }}
    .phase-bar {{ height: 4px; border-radius: 2px; margin-bottom: 0.5rem; min-width: 20px; }}
    .phase-meta {{ font-size: 0.85rem; color: #888; margin-bottom: 0.5rem; }}
    .phase-summary {{ font-size: 0.9rem; color: #bbb; }}
    .badge {{ background: #333; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; }}
    .ca-row {{ display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }}
    .ca-label {{ width: 200px; font-size: 0.9rem; text-align: right; }}
    .ca-bar-track {{ flex: 1; height: 20px; background: #1a1a1a; border-radius: 4px; overflow: hidden; }}
    .ca-bar-fill {{ height: 100%; border-radius: 4px; transition: width 0.3s; }}
    .ca-value {{ width: 50px; font-size: 0.9rem; color: #888; }}
    .footer {{ margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #222; color: #555; font-size: 0.8rem; }}
    @media print {{
        body {{ background: white; color: black; }}
        .phase {{ background: #f5f5f5; border: 1px solid #ddd; }}
        .ca-bar-track {{ background: #eee; }}
        .footer {{ color: #999; }}
    }}
</style>
</head>
<body>
    <h1>Software Archaeology: {report.repo}</h1>
    <div class="meta">{report.total_commits} commits &middot; {report.lifespan_days} days &middot; {len(report.phases)} phases &middot; {len(report.inflection_points)} inflection points</div>

    <h2>Cultural Algorithm Profile</h2>
    {ca_bars}

    <h2>Growth Phases</h2>
    {phase_rows}

    <div class="footer">
        Generated by Airlock Software Archaeology Engine &middot; Cultural Algorithm framework (Reynolds, 1994)
    </div>
</body>
</html>"""
