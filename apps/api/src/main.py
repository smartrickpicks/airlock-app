"""Airlock API — FastAPI application factory."""

import asyncio
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import sentry_sdk
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.websockets import WebSocket

from src.chat.routes import router as chat_router
from src.config import settings
from src.event_bus.routes import router as event_bus_router
from src.logging_config import configure_logging
from src.mcp.routes import router as mcp_router
from src.messenger.routes import router as messenger_router
from src.middleware.dynamic_cors import DynamicCORSMiddleware
from src.middleware.rate_limit import RateLimitMiddleware
from src.middleware.request_id import RequestIDMiddleware
from src.otto.routes import general_router as otto_general_router
from src.otto.routes import router as otto_router
from src.realtime.ws import websocket_endpoint
from src.routes.admin import router as admin_router
from src.routes.auth import router as auth_router
from src.routes.calendar import router as calendar_router
from src.routes.calibration import init_calibration_engine
from src.routes.calibration import router as calibration_router
from src.routes.connections import router as connections_router
from src.routes.constellation import router as constellation_router
from src.routes.credits import router as credits_router
from src.routes.crm import router as crm_router
from src.routes.documents import router as document_router
from src.routes.engines import router as engine_router
from src.routes.events import router as event_router
from src.routes.gateway import router as gateway_router
from src.routes.inference import init_inference_engine
from src.routes.inference import router as inference_router
from src.routes.invites import router as invite_router
from src.routes.linkedin import router as linkedin_router
from src.routes.mags import router as mags_router
from src.routes.notifications import router as notification_router
from src.routes.onboarding import router as onboarding_router
from src.routes.orbit import router as orbit_router
from src.routes.patches import router as patch_router
from src.routes.playbooks import router as playbook_router
from src.routes.pool import router as pool_router
from src.routes.profile import router as profile_router
from src.routes.review_queue import router as review_queue_router
from src.routes.search import router as search_router
from src.routes.sync import router as sync_router
from src.routes.tasks import router as tasks_router
from src.routes.vaults import router as vault_router
from src.routes.waitlist import router as waitlist_router
from src.routes.workspaces import router as workspace_router
from src.workflows.routes import router as workflow_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown events."""
    # Startup — cache airlock-persona profiles for inference engine
    init_inference_engine()
    init_calibration_engine()
    # Initialize MeiliSearch indexes
    from src.services.search import ensure_indexes

    await ensure_indexes()
    yield
    # Shutdown


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    configure_logging()

    app = FastAPI(
        title="Airlock API",
        description="Enterprise data operations platform API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Sentry — only initialize if DSN is configured
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.sentry_environment or settings.environment,
            release=app.version,
            traces_sample_rate=0.1,
            profiles_sample_rate=0.1,
        )

    # Request ID — generates UUID per request, binds to structlog context
    app.add_middleware(RequestIDMiddleware)

    # CORS — dynamic origin validation for white-label custom domains
    app.add_middleware(DynamicCORSMiddleware)

    # Rate limiting — per-user, per-category daily limits keyed by tier
    app.add_middleware(RateLimitMiddleware)

    # Health check
    @app.get("/health")
    async def health_check() -> dict[str, str]:
        return {"status": "healthy", "service": "airlock-api"}

    # Deep readiness check — verifies database and search connectivity
    @app.get("/health/ready")
    async def health_ready() -> JSONResponse:
        checks: dict[str, Any] = {}

        # --- Database check ---
        def _check_db() -> dict[str, Any]:
            from sqlalchemy import text

            from src.db import engine

            t0 = time.monotonic()
            try:
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                latency_ms = round((time.monotonic() - t0) * 1000, 2)
                return {"status": "healthy", "latency_ms": latency_ms}
            except Exception as exc:
                return {"status": "unhealthy", "error": str(exc)}

        # --- MeiliSearch check ---
        def _check_search() -> dict[str, Any]:
            import meilisearch

            t0 = time.monotonic()
            try:
                client = meilisearch.Client(settings.meili_url, settings.meili_master_key)
                client.health()
                latency_ms = round((time.monotonic() - t0) * 1000, 2)
                return {"status": "healthy", "latency_ms": latency_ms}
            except Exception as exc:
                return {"status": "unhealthy", "error": str(exc)}

        _timeout = 3.0

        db_result, search_result = await asyncio.gather(
            asyncio.wait_for(asyncio.to_thread(_check_db), timeout=_timeout),
            asyncio.wait_for(asyncio.to_thread(_check_search), timeout=_timeout),
            return_exceptions=True,
        )

        # Resolve asyncio.TimeoutError or other unexpected exceptions
        if isinstance(db_result, asyncio.TimeoutError):
            db_result = {"status": "unhealthy", "error": "timeout after 3s"}
        elif isinstance(db_result, BaseException):
            db_result = {"status": "unhealthy", "error": str(db_result)}

        if isinstance(search_result, asyncio.TimeoutError):
            search_result = {"status": "unhealthy", "error": "timeout after 3s"}
        elif isinstance(search_result, BaseException):
            search_result = {"status": "unhealthy", "error": str(search_result)}

        checks["database"] = db_result
        checks["search"] = search_result

        all_healthy = all(c.get("status") == "healthy" for c in checks.values())
        all_unhealthy = all(c.get("status") == "unhealthy" for c in checks.values())

        if all_healthy:
            overall = "healthy"
        elif all_unhealthy:
            overall = "unhealthy"
        else:
            overall = "degraded"

        http_status = 503 if overall == "unhealthy" else 200

        return JSONResponse(
            status_code=http_status,
            content={
                "status": overall,
                "service": "airlock-api",
                "version": "0.1.0",
                "checks": checks,
            },
        )

    # Register routers
    app.include_router(auth_router)
    app.include_router(document_router)
    app.include_router(vault_router)
    app.include_router(event_router)
    app.include_router(patch_router)
    app.include_router(engine_router)
    app.include_router(otto_router)
    app.include_router(otto_general_router)
    app.include_router(event_bus_router)
    app.include_router(messenger_router)
    app.include_router(chat_router)
    app.include_router(workflow_router)
    app.include_router(mcp_router)
    app.include_router(workspace_router)
    app.include_router(crm_router)
    app.include_router(tasks_router)
    app.include_router(inference_router)
    app.include_router(calibration_router)
    app.include_router(profile_router)
    app.include_router(mags_router)
    app.include_router(playbook_router)
    app.include_router(invite_router)
    app.include_router(linkedin_router)
    app.include_router(calendar_router)
    app.include_router(gateway_router)
    app.include_router(review_queue_router)
    app.include_router(search_router)
    app.include_router(notification_router)
    app.include_router(admin_router)
    app.include_router(credits_router)
    app.include_router(pool_router)
    app.include_router(constellation_router)
    app.include_router(connections_router)
    app.include_router(sync_router)
    app.include_router(onboarding_router)
    app.include_router(orbit_router)
    app.include_router(waitlist_router)

    # WebSocket endpoint
    @app.websocket("/ws")
    async def ws_route(websocket: WebSocket) -> None:
        await websocket_endpoint(websocket)

    return app


app = create_app()
