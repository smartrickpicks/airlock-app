"""MAGS Inference Engine routes.

Three endpoints for the profile inference pipeline:
- POST /api/v1/inference/drives  — Extract DECF drives from signals
- POST /api/v1/inference/profile — Match drives to closest PI profile
- POST /api/v1/inference/bmy     — Full Build My Workspace intake flow
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from src.schemas.inference import (
    BMYRequest,
    BMYResponse,
    InferDrivesRequest,
    InferDrivesResponse,
    MatchProfileRequest,
    MatchProfileResponse,
)
from src.services.inference import InferenceService, ProfileMatchingEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/inference", tags=["inference"])

# Module-level singleton — initialized on app startup via init_inference_engine()
_engine: ProfileMatchingEngine | None = None
_service: InferenceService | None = None


def init_inference_engine() -> None:
    """Initialize the ProfileMatchingEngine and InferenceService.

    Called during FastAPI lifespan startup.
    Loads all 17 profile YAMLs and inference rules into memory.
    Idempotent — safe to call multiple times.
    """
    global _engine, _service  # noqa: PLW0603
    if _engine is not None and _engine.is_loaded:
        logger.info("Inference engine already initialized — skipping")
        return

    _engine = ProfileMatchingEngine()
    _engine.load()
    _service = InferenceService(_engine)
    logger.info(
        "Inference engine initialized: %d profiles loaded",
        _engine.profile_count,
    )


def get_service() -> InferenceService:
    """Get the InferenceService singleton. Raises if not initialized."""
    if _service is None:
        msg = "Inference engine not initialized — call init_inference_engine() first"
        raise RuntimeError(msg)
    return _service


def get_engine() -> ProfileMatchingEngine:
    """Get the ProfileMatchingEngine singleton. Raises if not initialized."""
    if _engine is None:
        msg = "Inference engine not initialized — call init_inference_engine() first"
        raise RuntimeError(msg)
    return _engine


def _handle_inference_error(operation: str, exc: Exception) -> HTTPException:
    """Create appropriate HTTPException from inference errors.

    - RuntimeError (engine not ready) → 503 Service Unavailable
    - ValueError (bad input/no profiles) → 422 Unprocessable Entity
    - Other → 500 Internal Server Error
    """
    if isinstance(exc, RuntimeError):
        logger.error("%s failed — engine not ready: %s", operation, exc)
        return HTTPException(status_code=503, detail=f"{operation} — engine not ready")
    if isinstance(exc, ValueError):
        logger.warning("%s failed — invalid input: %s", operation, exc)
        return HTTPException(status_code=422, detail=str(exc))
    logger.exception("%s failed", operation)
    return HTTPException(status_code=500, detail=f"{operation} failed")


@router.post("/drives", response_model=InferDrivesResponse)
async def infer_drives(body: InferDrivesRequest) -> InferDrivesResponse:
    """Extract DECF drives from behavioral signals.

    Accepts goal statements, autonomy preferences, report style,
    team size, and optional career signals. Returns inferred drive
    scores on a 1-10 scale with signal attribution.
    """
    try:
        service = get_service()
        return service.infer_drives(body)
    except Exception as exc:
        raise _handle_inference_error("Drive inference", exc) from exc


@router.post("/profile", response_model=MatchProfileResponse)
async def match_profile(body: MatchProfileRequest) -> MatchProfileResponse:
    """Match DECF drives to the closest canonical PI profile.

    Computes Euclidean distance from the provided drive vector to all
    17 canonical profile vectors. Returns the best match with confidence
    score and top 3 candidates for transparency.
    """
    try:
        service = get_service()
        return service.match_profile(body)
    except Exception as exc:
        raise _handle_inference_error("Profile matching", exc) from exc


@router.post("/bmy", response_model=BMYResponse)
async def bmy_intake(body: BMYRequest) -> BMYResponse:
    """Full Build My Workspace (BMY) intake flow.

    Single-call endpoint for the Workspace Forge onboarding:
    signals → drives → profile match → workspace config → Otto config.

    Returns everything Otto needs to configure a personalized workspace,
    including a narrative explanation and enrichment suggestions.
    """
    try:
        service = get_service()
        return service.get_bmy_profile(body)
    except Exception as exc:
        raise _handle_inference_error("BMY intake", exc) from exc


@router.get("/profiles")
async def list_profiles() -> dict[str, Any]:
    """List all available PI profile IDs.

    Utility endpoint to verify which profiles are loaded.
    """
    try:
        engine = get_engine()
        return {"profiles": engine.get_all_profile_ids(), "count": engine.profile_count}
    except Exception as exc:
        raise _handle_inference_error("List profiles", exc) from exc


@router.get("/health")
async def inference_health() -> dict[str, str | int | bool]:
    """Health check for the inference engine."""
    try:
        engine = get_engine()
        return {
            "status": "healthy" if engine.is_loaded else "not_loaded",
            "profiles_loaded": engine.profile_count,
            "engine_ready": engine.is_loaded,
        }
    except Exception as exc:
        raise _handle_inference_error("Health check", exc) from exc
