"""Stub google_oauth service. Real implementation pending.

Note: this is a CONNECTION-status helper (Has the user linked Google?),
NOT the auth verify path. Auth verify lives in src.services.auth.
"""

from typing import Any


def get_google_connection(*args: Any, **kwargs: Any) -> dict | None:
    """Placeholder. Returns None until Google connection storage lands."""
    return None
