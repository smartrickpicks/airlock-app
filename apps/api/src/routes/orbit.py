"""Orbit API routes — public page + creator CRUD.

Public routes (no auth):
- GET  /orbit/p/{slug}                    — fetch published Orbit page
- POST /orbit/p/{slug}/quiz/start         — start fan quiz
- POST /orbit/p/{slug}/quiz/answer        — answer quiz question
- GET  /orbit/p/{slug}/quiz/{session_token} — get quiz result
- POST /orbit/p/{slug}/links/{link_id}/click — track link click

Creator routes (auth required):
- POST  /orbit/me              — create Orbit profile
- GET   /orbit/me              — get own Orbit profile
- PATCH /orbit/me              — update profile
- POST  /orbit/me/sections     — add section
- PATCH /orbit/me/sections/{section_id}  — update section
- POST  /orbit/me/sections/reorder       — reorder sections
- DELETE /orbit/me/sections/{section_id} — delete section
- POST  /orbit/me/links        — add link
- PATCH /orbit/me/personas/{persona_id}  — update persona
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.services.fan_calibration_service import FanCalibrationService
from src.services.orbit_link_service import OrbitLinkService
from src.services.orbit_persona_service import OrbitPersonaService
from src.services.orbit_section_service import OrbitSectionService
from src.services.orbit_service import InvalidSlugError, OrbitService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/orbit", tags=["orbit"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class CreateOrbitRequest(BaseModel):
    slug: str = Field(..., min_length=3, max_length=64)
    display_name: str = Field(..., min_length=1, max_length=128)
    tagline: str = Field(default="", max_length=256)


class UpdateOrbitRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=128)
    tagline: str | None = Field(default=None, max_length=256)
    is_published: bool | None = None
    brand_pillars: list[str] | None = None
    theme: dict | None = None


class CreateSectionRequest(BaseModel):
    section_type: str = Field(..., max_length=32)
    title: str = Field(..., max_length=128)
    content: dict = Field(default_factory=dict)


class UpdateSectionRequest(BaseModel):
    content: dict
    title: str | None = Field(default=None, max_length=128)


class ReorderSectionsRequest(BaseModel):
    order: list[dict[str, int]]  # [{"section_id": "...", "index": 0}, ...]


class CreateLinkRequest(BaseModel):
    title: str = Field(..., max_length=128)
    url: str
    icon: str | None = Field(default=None, max_length=32)


class UpdatePersonaRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=64)
    description: str | None = None
    traits: list[str] | None = None
    emoji: str | None = Field(default=None, max_length=8)


class QuizAnswerRequest(BaseModel):
    session_token: str
    question_id: int
    answer: str = Field(..., pattern="^[ab]$")


class OrbitProfileResponse(BaseModel):
    id: str
    slug: str
    display_name: str
    tagline: str
    avatar_url: str | None = None
    brand_pillars: Any = []
    theme: Any = {}
    is_published: bool = False
    page_views: int = 0
    sections: list[dict] = []
    personas: list[dict] = []
    links: list[dict] = []


class SectionResponse(BaseModel):
    id: str
    section_type: str
    title: str
    order_index: int
    is_visible: bool
    content: dict


class LinkResponse(BaseModel):
    id: str
    title: str
    url: str
    icon: str | None = None
    order_index: int
    click_count: int = 0


class PersonaResponse(BaseModel):
    id: str
    pi_profile: str
    display_name: str
    description: str
    traits: Any = []
    emoji: str | None = None
    order_index: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _profile_to_dict(profile, sections=None, personas=None, links=None) -> dict:
    """Convert an OrbitProfile ORM object to a response dict."""
    return {
        "id": profile.id,
        "slug": profile.slug,
        "display_name": profile.display_name,
        "tagline": profile.tagline,
        "avatar_url": profile.avatar_url,
        "brand_pillars": profile.brand_pillars,
        "theme": profile.theme,
        "is_published": profile.is_published,
        "page_views": profile.page_views,
        "sections": [
            {
                "id": s.id,
                "section_type": s.section_type,
                "title": s.title,
                "order_index": s.order_index,
                "is_visible": s.is_visible,
                "content": s.content,
            }
            for s in (sections or [])
        ],
        "personas": [
            {
                "id": p.id,
                "pi_profile": p.pi_profile,
                "display_name": p.display_name,
                "description": p.description,
                "traits": p.traits,
                "emoji": p.emoji,
                "order_index": p.order_index,
            }
            for p in (personas or [])
        ],
        "links": [
            {
                "id": lk.id,
                "title": lk.title,
                "url": lk.url,
                "icon": lk.icon,
                "order_index": lk.order_index,
                "click_count": lk.click_count,
            }
            for lk in (links or [])
        ],
    }


def _load_full_profile(db: Session, profile):
    """Load sections, personas, and links for a profile."""
    sections = OrbitSectionService.list_for_profile(db, profile.id)
    personas = OrbitPersonaService.list_for_profile(db, profile.id)
    links = OrbitLinkService.get_link_stats(db, profile.id)
    return sections, personas, links


# ---------------------------------------------------------------------------
# Public routes (no auth)
# ---------------------------------------------------------------------------


@router.get("/p/{slug}", response_model=OrbitProfileResponse)
async def get_public_orbit_page(
    slug: str,
    db: Session = Depends(get_db),  # noqa: B008
) -> OrbitProfileResponse:
    """Fetch a published Orbit page by slug."""
    profile = OrbitService.get_by_slug(db, slug)
    if not profile or not profile.is_published:
        raise HTTPException(status_code=404, detail="Orbit page not found")

    sections = OrbitSectionService.list_for_profile(db, profile.id, visible_only=True)
    personas = OrbitPersonaService.list_for_profile(db, profile.id)
    links_data = OrbitLinkService.get_link_stats(db, profile.id)

    result = _profile_to_dict(profile, sections, personas)
    # Links come as dicts from get_link_stats, attach directly
    result["links"] = links_data
    return OrbitProfileResponse(**result)


@router.post("/p/{slug}/quiz/start")
async def start_fan_quiz(
    slug: str,
    db: Session = Depends(get_db),  # noqa: B008
) -> dict:
    """Start a fan quiz on a published Orbit page."""
    profile = OrbitService.get_by_slug(db, slug)
    if not profile:
        raise HTTPException(status_code=404, detail="Orbit page not found")

    try:
        result = FanCalibrationService.start_quiz(db, profile.id)
        db.commit()
        return result
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to start quiz for slug=%s", slug)
        raise HTTPException(status_code=500, detail="Failed to start quiz") from exc


@router.post("/p/{slug}/quiz/answer")
async def answer_quiz_question(
    slug: str,
    body: QuizAnswerRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> dict:
    """Answer a quiz question."""
    profile = OrbitService.get_by_slug(db, slug)
    if not profile:
        raise HTTPException(status_code=404, detail="Orbit page not found")

    try:
        result = FanCalibrationService.answer(db, body.session_token, body.question_id, body.answer)
        db.commit()
        return result
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Quiz answer failed: slug=%s", slug)
        raise HTTPException(status_code=500, detail="Quiz answer failed") from exc


@router.get("/p/{slug}/quiz/{session_token}")
async def get_quiz_result(
    slug: str,
    session_token: str,
    db: Session = Depends(get_db),  # noqa: B008
) -> dict:
    """Get quiz result for a completed session."""
    profile = OrbitService.get_by_slug(db, slug)
    if not profile:
        raise HTTPException(status_code=404, detail="Orbit page not found")

    result = FanCalibrationService.get_result(db, session_token)
    if result is None:
        raise HTTPException(status_code=404, detail="Quiz result not found or not yet complete")
    return result


@router.post("/p/{slug}/links/{link_id}/click", status_code=204)
async def track_link_click(
    slug: str,
    link_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),  # noqa: B008
) -> None:
    """Track a link click (fire-and-forget)."""
    profile = OrbitService.get_by_slug(db, slug)
    if not profile:
        raise HTTPException(status_code=404, detail="Orbit page not found")

    referrer = request.headers.get("referer")
    user_agent = request.headers.get("user-agent")
    utm_source = request.query_params.get("utm_source")
    utm_medium = request.query_params.get("utm_medium")
    utm_campaign = request.query_params.get("utm_campaign")

    try:
        OrbitLinkService.record_click(
            db,
            link_id=link_id,
            orbit_profile_id=profile.id,
            referrer=referrer,
            user_agent=user_agent,
            utm_source=utm_source,
            utm_medium=utm_medium,
            utm_campaign=utm_campaign,
        )
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Link click tracking failed: link_id=%s", link_id)
        raise HTTPException(status_code=500, detail="Click tracking failed") from exc


# ---------------------------------------------------------------------------
# Creator routes (auth required)
# ---------------------------------------------------------------------------


@router.post("/me", response_model=OrbitProfileResponse, status_code=201)
async def create_orbit_profile(
    body: CreateOrbitRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> OrbitProfileResponse:
    """Create a new Orbit profile with default sections and personas."""
    user_id = current_user["sub"]

    # Check if user already has an Orbit profile
    existing = OrbitService.get_by_user_id(db, user_id)
    if existing:
        raise HTTPException(status_code=409, detail="Orbit profile already exists")

    try:
        profile = OrbitService.create_profile(
            db,
            user_id=user_id,
            slug=body.slug,
            display_name=body.display_name,
            tagline=body.tagline,
        )
        sections = OrbitService.add_default_sections(db, profile.id)
        personas = OrbitPersonaService.generate_defaults(db, profile.id)
        db.commit()
        db.refresh(profile)
        return OrbitProfileResponse(**_profile_to_dict(profile, sections, personas))
    except InvalidSlugError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Orbit profile creation failed: user=%s", user_id)
        raise HTTPException(status_code=500, detail="Profile creation failed") from exc


@router.get("/me", response_model=OrbitProfileResponse)
async def get_own_orbit_profile(
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> OrbitProfileResponse:
    """Get the authenticated user's Orbit profile."""
    user_id = current_user["sub"]
    profile = OrbitService.get_by_user_id(db, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="No Orbit profile found")

    sections, personas, links_data = _load_full_profile(db, profile)
    result = _profile_to_dict(profile, sections, personas)
    result["links"] = links_data
    return OrbitProfileResponse(**result)


@router.patch("/me", response_model=OrbitProfileResponse)
async def update_orbit_profile(
    body: UpdateOrbitRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> OrbitProfileResponse:
    """Update the authenticated user's Orbit profile."""
    user_id = current_user["sub"]
    profile = OrbitService.get_by_user_id(db, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="No Orbit profile found")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update")

    try:
        profile = OrbitService.update_profile(db, profile.id, **updates)
        db.commit()
        db.refresh(profile)
        sections, personas, links_data = _load_full_profile(db, profile)
        result = _profile_to_dict(profile, sections, personas)
        result["links"] = links_data
        return OrbitProfileResponse(**result)
    except Exception as exc:
        db.rollback()
        logger.exception("Orbit profile update failed: user=%s", user_id)
        raise HTTPException(status_code=500, detail="Profile update failed") from exc


@router.post("/me/sections", response_model=SectionResponse, status_code=201)
async def add_section(
    body: CreateSectionRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> SectionResponse:
    """Add a section to the authenticated user's Orbit page."""
    user_id = current_user["sub"]
    profile = OrbitService.get_by_user_id(db, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="No Orbit profile found")

    try:
        section = OrbitSectionService.create(
            db,
            orbit_profile_id=profile.id,
            section_type=body.section_type,
            title=body.title,
            content=body.content,
        )
        db.commit()
        db.refresh(section)
        return SectionResponse(
            id=section.id,
            section_type=section.section_type,
            title=section.title,
            order_index=section.order_index,
            is_visible=section.is_visible,
            content=section.content,
        )
    except Exception as exc:
        db.rollback()
        logger.exception("Section creation failed: user=%s", user_id)
        raise HTTPException(status_code=500, detail="Section creation failed") from exc


@router.patch("/me/sections/{section_id}", response_model=SectionResponse)
async def update_section(
    section_id: str,
    body: UpdateSectionRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> SectionResponse:
    """Update a section's content."""
    try:
        section = OrbitSectionService.update_content(db, section_id, body.content)
        if body.title is not None:
            section.title = body.title
            db.flush()
        db.commit()
        db.refresh(section)
        return SectionResponse(
            id=section.id,
            section_type=section.section_type,
            title=section.title,
            order_index=section.order_index,
            is_visible=section.is_visible,
            content=section.content,
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Section update failed: section_id=%s", section_id)
        raise HTTPException(status_code=500, detail="Section update failed") from exc


@router.post("/me/sections/reorder", status_code=200)
async def reorder_sections(
    body: ReorderSectionsRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> dict:
    """Reorder sections on the authenticated user's Orbit page."""
    try:
        order_tuples = [(item["section_id"], item["index"]) for item in body.order]
        OrbitSectionService.reorder(db, order_tuples)
        db.commit()
        return {"status": "ok"}
    except Exception as exc:
        db.rollback()
        logger.exception("Section reorder failed")
        raise HTTPException(status_code=500, detail="Reorder failed") from exc


@router.delete("/me/sections/{section_id}", status_code=204)
async def delete_section(
    section_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> None:
    """Delete a section from the authenticated user's Orbit page."""
    try:
        OrbitSectionService.delete(db, section_id)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Section delete failed: section_id=%s", section_id)
        raise HTTPException(status_code=500, detail="Section deletion failed") from exc


@router.post("/me/links", response_model=LinkResponse, status_code=201)
async def add_link(
    body: CreateLinkRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> LinkResponse:
    """Add a link to the authenticated user's Orbit page."""
    user_id = current_user["sub"]
    profile = OrbitService.get_by_user_id(db, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="No Orbit profile found")

    try:
        link = OrbitLinkService.create(
            db,
            orbit_profile_id=profile.id,
            title=body.title,
            url=body.url,
            icon=body.icon,
        )
        db.commit()
        db.refresh(link)
        return LinkResponse(
            id=link.id,
            title=link.title,
            url=link.url,
            icon=link.icon,
            order_index=link.order_index,
            click_count=link.click_count,
        )
    except Exception as exc:
        db.rollback()
        logger.exception("Link creation failed: user=%s", user_id)
        raise HTTPException(status_code=500, detail="Link creation failed") from exc


@router.patch("/me/personas/{persona_id}", response_model=PersonaResponse)
async def update_persona(
    persona_id: str,
    body: UpdatePersonaRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> PersonaResponse:
    """Update a persona on the authenticated user's Orbit page."""
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update")

    try:
        persona = OrbitPersonaService.update(db, persona_id, **updates)
        db.commit()
        db.refresh(persona)
        return PersonaResponse(
            id=persona.id,
            pi_profile=persona.pi_profile,
            display_name=persona.display_name,
            description=persona.description,
            traits=persona.traits,
            emoji=persona.emoji,
            order_index=persona.order_index,
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Persona update failed: persona_id=%s", persona_id)
        raise HTTPException(status_code=500, detail="Persona update failed") from exc
