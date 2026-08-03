"""Novelty Scorer — measures request novelty against known capabilities.

Scores how novel a user's request is by comparing it against:
  Layer 1: Task type matching (workflow-inference.yaml)
  Layer 2: Skill library matching (field manual capabilities)

Pure functions. No API calls. No persistence.

Marketing line: "Your vibe code is our boilerplate."
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import re

import yaml


_WORKFLOW_CONFIG = Path(__file__).parent / "workflow-inference.yaml"

# Keyword → task type mapping for fuzzy matching
_TASK_TYPE_KEYWORDS: dict[str, str] = {
    "build": "feature_build",
    "feature": "feature_build",
    "create": "feature_build",
    "implement": "feature_build",
    "add": "feature_build",
    "fix": "bug_fix",
    "bug": "bug_fix",
    "debug": "bug_fix",
    "patch": "bug_fix",
    "broken": "bug_fix",
    "refactor": "refactor",
    "restructure": "refactor",
    "cleanup": "refactor",
    "research": "research",
    "investigate": "research",
    "explore": "research",
    "prospect": "prospecting",
    "outreach": "prospecting",
    "sales": "prospecting",
    "onboard": "onboarding",
    "setup": "onboarding",
    "welcome": "onboarding",
    "compliance": "compliance_review",
    "audit": "compliance_review",
    "security": "compliance_review",
    "content": "content_creation",
    "write": "content_creation",
    "marketing": "content_creation",
    "blog": "content_creation",
    "deploy": "deployment",
    "release": "deployment",
    "migrate": "deployment",
    "ship": "deployment",
    "plan": "planning",
    "strategy": "planning",
    "roadmap": "planning",
    "architect": "planning",
}

_CATEGORY_THRESHOLDS: list[tuple[float, str]] = [
    (0.25, "routine"),
    (0.50, "familiar"),
    (0.75, "unusual"),
]


@dataclass
class NoveltyScore:
    """Result of novelty scoring a user request."""
    score: float                        # 0.0 (boilerplate) → 1.0 (unprecedented)
    category: str                       # routine | familiar | unusual | unprecedented
    matched_skills: list[str] = field(default_factory=list)
    matched_task_type: str | None = None
    layer_scores: dict[str, float] = field(default_factory=dict)
    routing: dict[str, object] = field(default_factory=dict)


def categorize(score: float) -> str:
    """Map a 0.0-1.0 score to a category label."""
    score = max(0.0, min(1.0, score))
    for threshold, label in _CATEGORY_THRESHOLDS:
        if score <= threshold:
            return label
    return "unprecedented"


def compute_routing(score: float) -> dict[str, object]:
    """Generate routing signals from a novelty score.

    Maps score to model tier, colony quorum size,
    cost warning flag, and trailblazer candidacy.
    """
    score = max(0.0, min(1.0, score))

    if score <= 0.25:
        tier = "scout"
    elif score <= 0.50:
        tier = "standard"
    else:
        tier = "flagship"

    if score > 0.75:
        quorum = 5
    elif score > 0.50:
        quorum = 3
    else:
        quorum = 2

    return {
        "dharma_tier": tier,
        "firefly_quorum": quorum,
        "cost_warning": score > 0.50,
        "trailblazer_candidate": score > 0.75,
    }


def load_task_types(config_path: Path | None = None) -> list[str]:
    """Load task type enum values from workflow-inference.yaml."""
    path = config_path or _WORKFLOW_CONFIG
    with open(path) as f:
        config = yaml.safe_load(f)
    return config["input"]["task_type"]["values"]


def match_task_type(request_text: str, task_types: list[str]) -> str | None:
    """Match request text against known task types.

    Checks for exact task type names first, then keyword matching.
    Returns the matched task type or None.
    """
    lower = request_text.lower()

    # Exact match first
    for tt in task_types:
        if tt in lower:
            return tt

    # Keyword match
    for keyword, task_type in _TASK_TYPE_KEYWORDS.items():
        if re.search(rf'\b{keyword}\b', lower):
            return task_type

    return None


_FIELD_MANUALS_DIR = Path(__file__).parent.parent / "docs" / "field-manuals"

# Stop words to exclude from keyword extraction
_STOP_WORDS = frozenset({
    "a", "an", "the", "to", "for", "of", "in", "on", "is", "it",
    "and", "or", "by", "with", "from", "at", "as", "its", "all",
    "not", "this", "that", "be", "are", "was", "has", "had", "do",
    "does", "did", "but", "if", "no", "so", "up", "out", "then",
})


def parse_field_manual_skills(content: str, module_name: str) -> list[dict]:
    """Parse function table from a field manual's Architecture section.

    Extracts function names and purpose text from the markdown table:
        | `function_name(args)` | Purpose description. |

    Returns list of dicts with keys: module, function, purpose.
    """
    skills = []
    pattern = re.compile(r'\|\s*`(\w+)\([^)]*\)`\s*\|\s*(.+?)\s*\|')

    for match in pattern.finditer(content):
        func_name = match.group(1)
        purpose = match.group(2).strip()
        if purpose and not purpose.startswith("-"):
            skills.append({
                "module": module_name,
                "function": func_name,
                "purpose": purpose,
            })

    return skills


def _extract_keywords(text: str) -> list[str]:
    """Extract meaningful keywords from text, excluding stop words."""
    words = re.findall(r'[a-z]+', text.lower())
    return [w for w in words if w not in _STOP_WORDS and len(w) > 2]


def build_skill_index(field_manuals_dir: Path | None = None) -> list[dict]:
    """Build a searchable skill index from all field manuals.

    Reads each .md file in the field manuals directory, parses the
    Architecture table, and extracts keywords for matching.

    Returns list of dicts with keys: module, function, purpose, keywords.
    """
    fm_dir = field_manuals_dir or _FIELD_MANUALS_DIR
    index = []

    if not fm_dir.is_dir():
        return index

    for md_file in sorted(fm_dir.glob("*.md")):
        module_name = md_file.stem
        content = md_file.read_text()
        skills = parse_field_manual_skills(content, module_name)

        for skill in skills:
            keywords = _extract_keywords(skill["purpose"])
            # Also add the function name parts (split on underscores)
            func_parts = skill["function"].split("_")
            keywords.extend(w.lower() for w in func_parts if len(w) > 2)
            # Deduplicate while preserving order
            seen = set()
            unique_keywords = []
            for kw in keywords:
                if kw not in seen:
                    seen.add(kw)
                    unique_keywords.append(kw)

            index.append({
                "module": skill["module"],
                "function": skill["function"],
                "purpose": skill["purpose"],
                "keywords": unique_keywords,
            })

    return index


def match_skills(request_text: str, skill_index: list[dict]) -> list[str]:
    """Match request text against the skill index.

    Returns list of unique module names that matched (best matches first).
    A skill matches if 2+ of its keywords appear in the request text.
    Plural forms are normalised by stripping a trailing 's'.
    """
    raw_keywords = _extract_keywords(request_text)
    # Include both original and de-pluralised form for each keyword
    request_keywords: set[str] = set()
    for kw in raw_keywords:
        request_keywords.add(kw)
        if kw.endswith("s") and len(kw) > 3:
            request_keywords.add(kw[:-1])
    matches: dict[str, int] = {}

    for entry in skill_index:
        overlap = len(request_keywords & set(entry["keywords"]))
        if overlap >= 2:
            module = entry["module"]
            matches[module] = max(matches.get(module, 0), overlap)

    # Sort by overlap count descending
    sorted_modules = sorted(
        matches.keys(), key=lambda m: matches[m], reverse=True,
    )
    return sorted_modules


# Layer weight constants
_LAYER1_WEIGHT = 0.3   # task type match
_LAYER2_WEIGHT = 0.7   # skill library match
_SKILL_MATCH_DECAY = 0.25  # each matched skill reduces novelty by this much


def score(
    request_text: str,
    skill_index: list[dict] | None = None,
    task_types: list[str] | None = None,
) -> NoveltyScore:
    """Score how novel a user's request is.

    Combines Layer 1 (task type matching) and Layer 2 (skill library matching)
    into a single NoveltyScore with routing signals.

    Args:
        request_text: The user's request/prompt text.
        skill_index: Pre-built skill index (builds from field manuals if None).
        task_types: Pre-loaded task types (loads from YAML if None).

    Returns:
        NoveltyScore with score, category, matches, and routing signals.
    """
    if task_types is None:
        task_types = load_task_types()
    if skill_index is None:
        skill_index = build_skill_index()

    # Layer 1: task type matching
    matched_type = match_task_type(request_text, task_types)
    layer1_score = 0.0 if matched_type else 0.5

    # Layer 2: skill library matching
    matched_modules = match_skills(request_text, skill_index)
    if matched_modules:
        layer2_score = max(0.0, 1.0 - len(matched_modules) * _SKILL_MATCH_DECAY)
    else:
        layer2_score = 1.0

    # Weighted combination
    final_score = (layer1_score * _LAYER1_WEIGHT) + (layer2_score * _LAYER2_WEIGHT)
    final_score = max(0.0, min(1.0, final_score))

    category = categorize(final_score)
    routing = compute_routing(final_score)

    return NoveltyScore(
        score=round(final_score, 4),
        category=category,
        matched_skills=matched_modules,
        matched_task_type=matched_type,
        layer_scores={
            "task_type": round(layer1_score, 4),
            "skill_library": round(layer2_score, 4),
        },
        routing=routing,
    )


if __name__ == "__main__":
    import sys as _sys

    if len(_sys.argv) < 2:
        print(
            "Usage: python -m inference.novelty_scorer \"<request text>\"",
            file=_sys.stderr,
        )
        _sys.exit(1)

    request_text = " ".join(_sys.argv[1:])
    result = score(request_text)

    print(f"Request:    {request_text}")
    print(f"Score:      {result.score}")
    print(f"Category:   {result.category}")
    print(f"Task type:  {result.matched_task_type or 'none'}")
    print(f"Skills:     {', '.join(result.matched_skills) or 'none'}")
    print(f"Layer scores: {result.layer_scores}")
    print(f"Routing:    {result.routing}")
