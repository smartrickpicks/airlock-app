"""Playbook template loader — reads and validates YAML playbook definitions.

Templates are stored as YAML files in the `templates/` directory.
Loaded templates are cached for performance.  Cache persists for the
lifetime of the process — call ``clear_template_cache()`` or restart
the server to pick up YAML changes on disk.
"""

from __future__ import annotations

import logging
from functools import cache
from pathlib import Path

import yaml

from src.schemas.playbook import PlaybookTemplate, PlaybookTemplateSummary

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Template directory
# ---------------------------------------------------------------------------

TEMPLATES_DIR = Path(__file__).parent / "templates"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def list_templates() -> list[PlaybookTemplateSummary]:
    """List all available playbook templates with summary info."""
    templates = _load_all_templates()
    return [
        PlaybookTemplateSummary(
            id=t.id,
            name=t.name,
            description=t.description,
            module=t.module,
            version=t.version,
            node_count=len(t.nodes),
            gate_count=t.gate_count(),
        )
        for t in templates
    ]


def get_template(template_id: str) -> PlaybookTemplate | None:
    """Get a specific template by ID. Returns None if not found."""
    templates = {t.id: t for t in _load_all_templates()}
    return templates.get(template_id)


def get_all_templates() -> list[PlaybookTemplate]:
    """Get all templates with full details.

    Returns a shallow copy so callers cannot mutate the cached list.
    """
    return list(_load_all_templates())


def clear_template_cache() -> None:
    """Clear the template cache. Useful for testing or hot-reload."""
    _load_template_file.cache_clear()
    _load_all_templates.cache_clear()


# ---------------------------------------------------------------------------
# Internal loading
# ---------------------------------------------------------------------------


@cache
def _load_all_templates() -> list[PlaybookTemplate]:
    """Load all YAML templates from the templates directory."""
    templates: list[PlaybookTemplate] = []

    if not TEMPLATES_DIR.exists():
        logger.warning("Templates directory not found: %s", TEMPLATES_DIR)
        return templates

    for yaml_file in sorted(TEMPLATES_DIR.glob("*.yaml")):
        template = _load_template_file(yaml_file)
        if template:
            templates.append(template)

    logger.info("Loaded %d playbook templates", len(templates))
    return templates


@cache
def _load_template_file(path: Path) -> PlaybookTemplate | None:
    """Load and validate a single YAML template file."""
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception:
        logger.exception("Failed to read template file: %s", path)
        return None

    if not raw or "playbook" not in raw:
        logger.warning("Invalid template format (missing 'playbook' key): %s", path)
        return None

    try:
        template = PlaybookTemplate.model_validate(raw["playbook"])
    except Exception:
        logger.exception("Failed to validate template: %s", path)
        return None

    # Validate DAG structure
    errors = template.validate_dag()
    if errors:
        for err in errors:
            logger.error("DAG validation error in '%s': %s", path.name, err)
        return None

    return template
