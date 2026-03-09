"""MAGS (Multi-Arc Governance System) routes.

Provides endpoints for:
- Prompt composition preview (development/debugging)
- Archetype resolution
- Available archetypes/modules/chambers listing

TODO(M25): Add auth via Depends(get_current_user) when auth system is wired.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from src.services.mags.prompt_composer import (
    META_ARCHETYPE_DEFAULTS,
    PROFILE_ARCHETYPE_MAP,
    VALID_ARCHETYPES,
    VALID_CHAMBERS,
    VALID_MODULES,
    compose_prompt,
    resolve_archetype,
)

router = APIRouter(prefix="/api/v1/mags", tags=["mags"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ComposePromptRequest(BaseModel):
    """Request to compose a system prompt from fragments."""

    user_profile: dict[str, Any] | None = Field(
        default=None,
        description="User profile dict with pi_profile, meta_archetype, drives, mags_config, etc.",
    )
    archetype: str | None = Field(
        default=None,
        description="Otto archetype override (analyst, strategist, executor, connector, guardian, architect). "
        "If omitted, auto-resolved from user_profile.",
    )
    module: str = Field(default="contracts", description="Active module")
    chamber: str = Field(default="discover", description="Current chamber")
    vault_context: dict[str, Any] | None = Field(
        default=None,
        description="Optional vault context (vault_id, gate_color, health_score, field counts).",
    )


class ComposePromptResponse(BaseModel):
    """Response with composed system prompt."""

    prompt: str
    archetype_used: str
    module: str
    chamber: str
    fragment_count: int
    char_count: int


class ResolveArchetypeRequest(BaseModel):
    """Request to resolve an Otto archetype from profile data."""

    pi_profile: str | None = None
    meta_archetype: str | None = None
    explicit_archetype: str | None = None


class ResolveArchetypeResponse(BaseModel):
    """Response with resolved archetype."""

    archetype: str
    source: str  # "explicit", "pi_profile", "meta_archetype", "fallback"


class AvailableFragmentsResponse(BaseModel):
    """Response listing available prompt fragments."""

    archetypes: list[str]
    modules: list[str]
    chambers: list[str]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/prompts/compose", response_model=ComposePromptResponse)
async def compose(body: ComposePromptRequest) -> ComposePromptResponse:
    """Compose a system prompt from modular fragments.

    If `archetype` is provided, uses it directly.
    If omitted, auto-resolves from `user_profile` (pi_profile → meta_archetype → fallback).
    """
    # Resolve archetype once — either explicit or auto-resolved from profile
    if body.archetype:
        archetype_used = body.archetype
    else:
        archetype_used = resolve_archetype(
            pi_profile=(body.user_profile or {}).get("pi_profile"),
            meta_archetype=(body.user_profile or {}).get("meta_archetype"),
            explicit_archetype=((body.user_profile or {}).get("mags_config") or {}).get(
                "archetype"
            ),
        )

    prompt = compose_prompt(
        user_profile=body.user_profile,
        archetype=archetype_used,
        module=body.module,
        chamber=body.chamber,
        vault_context=body.vault_context,
    )

    # Count non-empty sections
    sections = [s for s in prompt.split("\n\n---\n\n") if s.strip()]

    return ComposePromptResponse(
        prompt=prompt,
        archetype_used=archetype_used,
        module=body.module,
        chamber=body.chamber,
        fragment_count=len(sections),
        char_count=len(prompt),
    )


@router.post("/prompts/resolve-archetype", response_model=ResolveArchetypeResponse)
async def resolve(body: ResolveArchetypeRequest) -> ResolveArchetypeResponse:
    """Resolve which Otto archetype to use from profile data."""
    archetype = resolve_archetype(
        pi_profile=body.pi_profile,
        meta_archetype=body.meta_archetype,
        explicit_archetype=body.explicit_archetype,
    )

    # Determine source — check whether the value actually resolved, not just present
    if body.explicit_archetype and body.explicit_archetype.lower() in VALID_ARCHETYPES:
        source = "explicit"
    elif body.pi_profile and body.pi_profile.lower() in PROFILE_ARCHETYPE_MAP:
        source = "pi_profile"
    elif body.meta_archetype and body.meta_archetype.lower() in META_ARCHETYPE_DEFAULTS:
        source = "meta_archetype"
    else:
        source = "fallback"

    return ResolveArchetypeResponse(archetype=archetype, source=source)


@router.get("/prompts/fragments", response_model=AvailableFragmentsResponse)
async def list_fragments() -> AvailableFragmentsResponse:
    """List available prompt fragment types."""
    return AvailableFragmentsResponse(
        archetypes=sorted(VALID_ARCHETYPES),
        modules=sorted(VALID_MODULES),
        chambers=sorted(VALID_CHAMBERS),
    )


@router.get("/prompts/preview")
async def preview_prompt(
    archetype: str = Query(default="executor"),  # noqa: B008
    module: str = Query(default="contracts"),  # noqa: B008
    chamber: str = Query(default="discover"),  # noqa: B008
) -> dict[str, str | int]:
    """Quick GET preview of a composed prompt without user profile context.

    Useful for debugging prompt fragments in the browser.
    """
    prompt = compose_prompt(
        user_profile=None,
        archetype=archetype,
        module=module,
        chamber=chamber,
        vault_context=None,
    )
    return {
        "prompt": prompt,
        "archetype": archetype,
        "module": module,
        "chamber": chamber,
        "char_count": len(prompt),
    }
