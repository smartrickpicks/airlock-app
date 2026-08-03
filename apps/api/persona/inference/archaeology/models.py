"""Data models for software archaeology."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Commit:
    """A single parsed commit from git log."""
    sha: str
    timestamp: datetime
    message: str
    files_changed: int
    insertions: int
    deletions: int
    files: list[str]


@dataclass
class InflectionPoint:
    """A detected moment where the project pivoted."""
    commit_sha: str
    timestamp: datetime
    type: str          # refactor, dependency_shift, architecture_pivot, scale_event, governance_change
    description: str
    magnitude: float   # 0-1
    files_involved: list[str]


@dataclass
class GrowthPhase:
    """A coherent period of development with a dominant knowledge source."""
    start: datetime
    end: datetime
    commits: int
    label: str                      # foundation, rapid_growth, stabilization, exploration, rewrite
    dominant_knowledge_source: str   # domain, normative, situational, topographic, historical
    summary: str
    inflection_points: list[InflectionPoint]


@dataclass
class BenchmarkSpec:
    """A generated capability test derived from a growth phase."""
    phase: str
    pattern: str
    assertions: list[str]
    difficulty: str         # foundation, intermediate, advanced
    knowledge_source: str
    estimated_commits: int


@dataclass
class ArchaeologyReport:
    """Complete archaeology analysis of a repository."""
    repo: str
    total_commits: int
    lifespan_days: int
    phases: list[GrowthPhase]
    inflection_points: list[InflectionPoint]
    ca_profile: dict[str, float]
    field_manual: str | None
    benchmark_specs: list[BenchmarkSpec]
