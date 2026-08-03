"""Ingest layer — git log parsing and shallow clone management."""
from __future__ import annotations

import re
from datetime import datetime, timezone

from inference.archaeology.models import Commit

_COMMIT_HEADER_RE = re.compile(r"^([a-z0-9]+)\|(.+?)\|(.+)$")
_STAT_SUMMARY_RE = re.compile(
    r"^\s*(\d+)\s+files?\s+changed"
    r"(?:,\s+(\d+)\s+insertions?\(\+\))?"
    r"(?:,\s+(\d+)\s+deletions?\(-\))?"
)
_FILE_LINE_RE = re.compile(r"^\s+(.+?)\s+\|")

GIT_LOG_FORMAT = "%H|%aI|%s"


def parse_git_log(raw_log: str) -> list[Commit]:
    """Parse git log --stat output into Commit objects."""
    if not raw_log.strip():
        return []

    commits: list[Commit] = []
    lines = raw_log.strip().split("\n")

    current_sha = ""
    current_ts = ""
    current_msg = ""
    current_files_changed = 0
    current_insertions = 0
    current_deletions = 0
    current_files: list[str] = []

    def _flush():
        if current_sha:
            ts = current_ts.replace("Z", "+00:00")
            commits.append(Commit(
                sha=current_sha,
                timestamp=datetime.fromisoformat(ts),
                message=current_msg,
                files_changed=current_files_changed,
                insertions=current_insertions,
                deletions=current_deletions,
                files=list(current_files),
            ))

    for line in lines:
        header = _COMMIT_HEADER_RE.match(line)
        if header:
            _flush()
            current_sha = header.group(1)
            current_ts = header.group(2)
            current_msg = header.group(3)
            current_files_changed = 0
            current_insertions = 0
            current_deletions = 0
            current_files = []
            continue

        stat = _STAT_SUMMARY_RE.match(line)
        if stat:
            current_files_changed = int(stat.group(1))
            current_insertions = int(stat.group(2) or 0)
            current_deletions = int(stat.group(3) or 0)
            continue

        file_match = _FILE_LINE_RE.match(line)
        if file_match:
            current_files.append(file_match.group(1).strip())

    _flush()
    commits.sort(key=lambda c: c.timestamp)
    return commits


import subprocess
import tempfile
from pathlib import Path


_MAX_COMMITS = 500


def clone_and_log(
    repo_url: str,
    repo_path: str | None = None,
    max_commits: int = _MAX_COMMITS,
) -> str:
    """Shallow clone a repo (or use local path) and return git log --stat output."""
    log_cmd = [
        "git", "log", f"--format={GIT_LOG_FORMAT}",
        "--stat", "--stat-width=200",
        f"--max-count={max_commits}",
    ]

    if repo_path:
        result = subprocess.run(
            log_cmd, capture_output=True, text=True, cwd=repo_path, timeout=120,
        )
        return result.stdout

    with tempfile.TemporaryDirectory(prefix="archaeology_") as tmpdir:
        subprocess.run(
            ["git", "clone", "--filter=blob:none", "--no-checkout", repo_url, tmpdir],
            capture_output=True, text=True, timeout=120,
        )
        result = subprocess.run(
            log_cmd, capture_output=True, text=True, cwd=tmpdir, timeout=300,
        )
        return result.stdout
