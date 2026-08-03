"""Analysis layer — inflection detection, phase segmentation, CA annotation."""
from __future__ import annotations

import statistics
from datetime import timedelta

from inference.archaeology.models import (
    Commit, InflectionPoint, GrowthPhase, BenchmarkSpec, ArchaeologyReport,
)

_DEPENDENCY_FILES = {
    "requirements.txt", "pyproject.toml", "setup.py", "setup.cfg",
    "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "go.mod", "go.sum", "Cargo.toml", "Cargo.lock",
    "Gemfile", "Gemfile.lock", "composer.json",
}

_CHURN_THRESHOLD = 15
_VELOCITY_SPIKE_FACTOR = 3.0


def detect_inflections(commits: list[Commit]) -> list[InflectionPoint]:
    """Detect architectural pivot points from a commit stream."""
    if len(commits) < 2:
        return []

    churn_values = [c.files_changed for c in commits]
    median_churn = statistics.median(churn_values) if churn_values else 3

    known_top_dirs: set[str] = set()
    for c in commits[:1]:
        for f in c.files:
            parts = f.split("/")
            if len(parts) > 1:
                known_top_dirs.add(parts[0])

    inflections: list[InflectionPoint] = []

    for i, commit in enumerate(commits):
        if i == 0:
            continue

        # High churn = refactor
        if commit.files_changed >= _CHURN_THRESHOLD and commit.files_changed > median_churn * _VELOCITY_SPIKE_FACTOR:
            inflections.append(InflectionPoint(
                commit_sha=commit.sha,
                timestamp=commit.timestamp,
                type="refactor",
                description=f"High churn: {commit.files_changed} files changed — {commit.message}",
                magnitude=min(1.0, commit.files_changed / 50),
                files_involved=commit.files[:10],
            ))
            for f in commit.files:
                parts = f.split("/")
                if len(parts) > 1:
                    known_top_dirs.add(parts[0])
            continue

        # Dependency shift (skip batch/mechanical commits)
        dep_files = [f for f in commit.files if f.split("/")[-1] in _DEPENDENCY_FILES]
        if len(dep_files) >= 1 and commit.files_changed >= 3 and not _is_batch_commit(commit.message):
            inflections.append(InflectionPoint(
                commit_sha=commit.sha,
                timestamp=commit.timestamp,
                type="dependency_shift",
                description=f"Dependency change: {', '.join(dep_files)} — {commit.message}",
                magnitude=min(1.0, len(dep_files) / 5),
                files_involved=dep_files,
            ))
            continue

        # New top-level directories = architecture pivot
        new_dirs: set[str] = set()
        for f in commit.files:
            parts = f.split("/")
            if len(parts) > 1:
                top = parts[0]
                if top not in known_top_dirs:
                    new_dirs.add(top)

        if len(new_dirs) >= 2:
            inflections.append(InflectionPoint(
                commit_sha=commit.sha,
                timestamp=commit.timestamp,
                type="architecture_pivot",
                description=f"New directories: {', '.join(sorted(new_dirs))} — {commit.message}",
                magnitude=min(1.0, len(new_dirs) / 5),
                files_involved=commit.files[:10],
            ))

        for f in commit.files:
            parts = f.split("/")
            if len(parts) > 1:
                known_top_dirs.add(parts[0])

    return inflections


_KS_LABELS = ["domain", "normative", "situational", "topographic", "historical"]

_PHASE_SIGNALS = {
    "domain": {"feat", "feature", "add", "implement", "create", "model", "api", "schema", "module", "component"},
    "normative": {"ci", "test", "lint", "format", "config", "github", "action", "workflow", "policy", "security",
                  "chore", "build", "release"},
    "situational": {"fix", "bug", "hotfix", "patch", "issue", "error", "crash", "revert"},
    "topographic": {"experiment", "prototype", "poc", "explore", "spike", "draft", "wip", "try"},
    "historical": {"refactor", "rewrite", "migrate", "v2", "v3", "redesign", "overhaul", "deprecate"},
}

# Gitmoji → knowledge source mapping (FastAPI, Motion, etc. use emoji prefixes)
_EMOJI_SIGNALS = {
    "domain": {"\u2728", "\U0001f389"},           # ✨ sparkles, 🎉 tada = new features
    "normative": {"\U0001f477", "\U0001f4dd",     # 👷 CI, 📝 docs
                  "\U0001f516", "\U0001f527",      # 🔖 release, 🔧 config
                  "\u2705", "\U0001f6a8",          # ✅ tests, 🚨 linting
                  "\u267b\ufe0f", "\U0001f9f9"},   # ♻️ refactor (normative in emoji convention), 🧹 cleanup
    "situational": {"\U0001f41b", "\U0001f691",    # 🐛 bug, 🚑 hotfix
                    "\U0001f512\ufe0f"},            # 🔒️ security fix
    "topographic": {"\U0001f9ea", "\U0001f6a7"},   # 🧪 experiment, 🚧 WIP
    "historical": {"\U0001f5d1\ufe0f",             # 🗑️ deprecate
                   "\u2b06\ufe0f", "\u2b07\ufe0f"},  # ⬆️⬇️ dependency changes (version migration)
}

# Commit messages that indicate mechanical/batch work (not true inflection points)
_BATCH_PATTERNS = {"update translations", "update release notes", "codegen metadata"}


def _is_batch_commit(msg: str) -> bool:
    """Detect mechanical/batch commits that shouldn't influence classification."""
    lower = msg.lower()
    return any(pat in lower for pat in _BATCH_PATTERNS)


def _classify_phase_ks(commits: list[Commit]) -> str:
    scores = {ks: 0 for ks in _KS_LABELS}
    for commit in commits:
        if _is_batch_commit(commit.message):
            continue
        msg = commit.message.lower()
        matched = False
        # Check emoji signals first (higher confidence)
        for ks, emojis in _EMOJI_SIGNALS.items():
            for emoji in emojis:
                if emoji in commit.message:  # raw message, not lowered (emojis are case-insensitive)
                    scores[ks] += 1
                    matched = True
                    break
            if matched:
                break
        if matched:
            continue
        # Fall back to keyword signals
        for ks, keywords in _PHASE_SIGNALS.items():
            for kw in keywords:
                if kw in msg:
                    scores[ks] += 1
                    break
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "domain"
    return best


def _label_phase(dominant_ks: str, index: int, total_phases: int) -> str:
    if index == 0:
        return "foundation"
    if dominant_ks == "historical":
        return "rewrite"
    if dominant_ks == "normative":
        return "stabilization"
    if dominant_ks == "topographic":
        return "exploration"
    if index == total_phases - 1:
        return "maturation"
    return "rapid_growth"


def segment_phases(
    commits: list[Commit],
    inflection_points: list[InflectionPoint],
) -> list[GrowthPhase]:
    if not commits:
        return []

    split_shas = {ip.commit_sha for ip in inflection_points}
    segments: list[list[Commit]] = []
    current: list[Commit] = []

    for commit in commits:
        if commit.sha in split_shas and current:
            segments.append(current)
            current = [commit]
        else:
            current.append(commit)

    if current:
        segments.append(current)

    phases: list[GrowthPhase] = []
    for i, seg in enumerate(segments):
        dominant_ks = _classify_phase_ks(seg)
        label = _label_phase(dominant_ks, i, len(segments))

        phase_start = seg[0].timestamp
        phase_end = seg[-1].timestamp
        phase_ips = [
            ip for ip in inflection_points
            if phase_start <= ip.timestamp <= phase_end
        ]

        messages = [c.message for c in seg[:5]]
        summary = "; ".join(messages)
        if len(seg) > 5:
            summary += f" ... and {len(seg) - 5} more commits"

        phases.append(GrowthPhase(
            start=phase_start,
            end=phase_end,
            commits=len(seg),
            label=label,
            dominant_knowledge_source=dominant_ks,
            summary=summary,
            inflection_points=phase_ips,
        ))

    return phases


_DIFFICULTY_MAP = {
    0: "foundation",
    1: "foundation",
    2: "intermediate",
    3: "intermediate",
}

_KS_PATTERNS = {
    "domain": "system_architecture",
    "normative": "governance_infrastructure",
    "situational": "incident_response",
    "topographic": "exploration_prototype",
    "historical": "migration_rewrite",
}

_KS_ASSERTIONS = {
    "domain": [
        "Can implement the core data model",
        "Can design the primary API surface",
        "Can structure modules for this domain",
    ],
    "normative": [
        "Can set up CI/CD pipeline",
        "Can implement test infrastructure",
        "Can establish contribution guidelines",
    ],
    "situational": [
        "Can diagnose and fix common failure modes",
        "Can implement error handling patterns",
        "Can write regression tests from bug reports",
    ],
    "topographic": [
        "Can prototype a novel approach",
        "Can evaluate trade-offs between alternatives",
        "Can build a proof of concept",
    ],
    "historical": [
        "Can plan a migration strategy",
        "Can refactor without breaking interfaces",
        "Can identify technical debt priorities",
    ],
}


def generate_benchmarks(phases: list[GrowthPhase]) -> list[BenchmarkSpec]:
    """Generate one benchmark spec per growth phase.

    Each benchmark tests capability for the patterns discovered in that phase.
    """
    specs = []
    for i, phase in enumerate(phases):
        ks = phase.dominant_knowledge_source
        difficulty = _DIFFICULTY_MAP.get(i, "advanced")

        specs.append(BenchmarkSpec(
            phase=phase.label,
            pattern=_KS_PATTERNS.get(ks, "general"),
            assertions=_KS_ASSERTIONS.get(ks, ["Can replicate this phase's patterns"]),
            difficulty=difficulty,
            knowledge_source=ks,
            estimated_commits=phase.commits,
        ))

    return specs
