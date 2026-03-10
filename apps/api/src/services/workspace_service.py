"""Workspace service — shared business logic for workspace operations."""

import re


def slugify(name: str) -> str:
    """Convert workspace name to URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")
