"""Stub sync router. Real implementation pending."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/sync", tags=["sync"])


@router.get("/status")
def sync_status() -> dict:
    return {"stub": True, "synced": False}
