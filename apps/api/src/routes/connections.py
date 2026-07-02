"""Stub connections router.

Real implementation pending. Added 2026-05-08 to unblock fly deploy after
discovering commit b309eb9 added the import in main.py without committing
the module file. See handoff:
2026-05-08-0130-threma-door-auth-ladder-launch.yaml
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/connections", tags=["connections"])


@router.get("/")
def list_connections() -> dict:
    """Placeholder list endpoint. Returns empty list until feature lands."""
    return {"connections": [], "stub": True}
