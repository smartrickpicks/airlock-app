"""Stub waitlist router. Real implementation pending."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/waitlist", tags=["waitlist"])


@router.get("/")
def list_waitlist() -> dict:
    return {"waitlist": [], "stub": True}
