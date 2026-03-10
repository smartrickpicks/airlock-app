"""LinkedIn scrape routes — proxy to hosted MCP server."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.services.linkedin import infer_drives_from_linkedin, scrape_linkedin_profile

router = APIRouter(prefix="/api/v1/linkedin", tags=["linkedin"])


class ScrapeRequest(BaseModel):
    linkedin_url: str


class ScrapeResponse(BaseModel):
    name: str
    headline: str | None = None
    location: str | None = None
    summary: str | None = None
    experience: list[dict] = []
    skills: list[str] = []
    education: list[dict] = []
    source_url: str
    inferred_drives: dict


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_profile(req: ScrapeRequest):
    """Scrape a LinkedIn profile and infer drive signals."""
    if not req.linkedin_url or "linkedin.com" not in req.linkedin_url:
        raise HTTPException(status_code=400, detail="Invalid LinkedIn URL")

    profile = await scrape_linkedin_profile(req.linkedin_url)
    drives = infer_drives_from_linkedin(profile)

    return ScrapeResponse(
        name=profile.get("name", "Unknown"),
        headline=profile.get("headline"),
        location=profile.get("location"),
        summary=profile.get("summary"),
        experience=profile.get("experience", []),
        skills=profile.get("skills", []),
        education=profile.get("education", []),
        source_url=profile.get("source_url", req.linkedin_url),
        inferred_drives=drives,
    )
