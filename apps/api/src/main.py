"""Airlock API — FastAPI application factory."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocket

from src.config import settings
from src.event_bus.routes import router as event_bus_router
from src.mcp.routes import router as mcp_router
from src.messenger.routes import router as messenger_router
from src.otto.routes import general_router as otto_general_router
from src.otto.routes import router as otto_router
from src.realtime.ws import websocket_endpoint
from src.routes.auth import router as auth_router
from src.routes.crm import router as crm_router
from src.routes.documents import router as document_router
from src.routes.engines import router as engine_router
from src.routes.events import router as event_router
from src.routes.inference import init_inference_engine
from src.routes.inference import router as inference_router
from src.routes.mags import router as mags_router
from src.routes.playbooks import router as playbook_router
from src.routes.profile import router as profile_router
from src.routes.tasks import router as tasks_router
from src.routes.vaults import router as vault_router
from src.routes.workspaces import router as workspace_router
from src.workflows.routes import router as workflow_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown events."""
    # Startup — cache airlock-persona profiles for inference engine
    init_inference_engine()
    yield
    # Shutdown


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Airlock API",
        description="Enterprise data operations platform API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health check
    @app.get("/health")
    async def health_check() -> dict[str, str]:
        return {"status": "healthy", "service": "airlock-api"}

    # Register routers
    app.include_router(auth_router)
    app.include_router(document_router)
    app.include_router(vault_router)
    app.include_router(event_router)
    app.include_router(engine_router)
    app.include_router(otto_router)
    app.include_router(otto_general_router)
    app.include_router(event_bus_router)
    app.include_router(messenger_router)
    app.include_router(workflow_router)
    app.include_router(mcp_router)
    app.include_router(workspace_router)
    app.include_router(crm_router)
    app.include_router(tasks_router)
    app.include_router(inference_router)
    app.include_router(profile_router)
    app.include_router(mags_router)
    app.include_router(playbook_router)

    # WebSocket endpoint
    @app.websocket("/ws")
    async def ws_route(websocket: WebSocket) -> None:
        await websocket_endpoint(websocket)

    return app


app = create_app()
