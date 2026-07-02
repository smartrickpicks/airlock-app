"""Permission check service — role enforcement for vault operations.

Role hierarchy: owner > gatekeeper > builder > viewer
Chamber advancement rules per universal-chambers spec:
  discover -> build: builder+
  build -> review: builder+
  review -> ship: gatekeeper+
  archive: owner only
"""

from __future__ import annotations

ROLE_HIERARCHY: dict[str, int] = {
    "viewer": 0,
    "builder": 1,
    "gatekeeper": 2,
    "owner": 3,
}

# Minimum role required to advance FROM each chamber
CHAMBER_ADVANCE_REQUIRED_ROLE: dict[str, str] = {
    "discover": "builder",
    "build": "builder",
    "review": "gatekeeper",
}


class PermissionDeniedError(Exception):
    """Raised when a user lacks the required role for an operation."""

    def __init__(self, required_role: str, actual_role: str, action: str):
        self.required_role = required_role
        self.actual_role = actual_role
        self.action = action
        super().__init__(
            f"Permission denied: {action} requires '{required_role}' role, user has '{actual_role}'"
        )


def check_vault_permission(user_role: str, required_role: str) -> bool:
    """Check if user_role meets or exceeds required_role in hierarchy."""
    user_level = ROLE_HIERARCHY.get(user_role, -1)
    required_level = ROLE_HIERARCHY.get(required_role, 999)
    return user_level >= required_level


def check_chamber_advance_permission(user_role: str, current_chamber: str) -> bool:
    """Check if a user with given role can advance a vault from current_chamber.

    Returns True if the role meets the minimum for advancement.
    Returns False for ship chamber (final — cannot advance further).
    """
    required_role = CHAMBER_ADVANCE_REQUIRED_ROLE.get(current_chamber)
    if required_role is None:
        return False  # ship chamber — cannot advance
    return check_vault_permission(user_role, required_role)
