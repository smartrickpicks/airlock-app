"""Otto AI routes — SSE streaming chat + session management."""

import logging
import os
import time
from collections.abc import Generator
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.config import settings
from src.db import get_db
from src.middleware.auth import get_current_user
from src.otto.agent import build_agent_context_prompt, build_system_prompt, generate_stub_response
from src.otto.enrichment import build_user_agent_context, build_vault_context
from src.otto.feature_gate import is_otto_enabled, otto_circuit_breaker
from src.otto.session_service import (
    clear_session,
    get_or_create_session,
    get_session_with_messages,
    save_message,
)
from src.otto.sse import (
    format_sse_done,
    format_sse_error,
    format_sse_finish,
    format_sse_text,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v3/vaults/{vault_id}/otto", tags=["otto"])
general_router = APIRouter(prefix="/api/v3/otto", tags=["otto"])

# Provider name → OpenAI-compatible base URL
PROVIDER_BASE_URLS: dict[str, str] = {
    "Anthropic": "https://api.anthropic.com/v1",
    "OpenRouter": "https://openrouter.ai/api/v1",
}


class ProviderConfig(BaseModel):
    """AI provider config from the admin capability tree."""

    provider: str = "Anthropic"
    api_key: str = ""
    model: str = "claude-sonnet-4-6"


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    provider_config: ProviderConfig | None = None
    module: str | None = None  # contracts | crm | tasks | calendar | documents
    chamber: str | None = None  # discover | build | review | ship
    # Agent graph fields
    surface: Literal["task_runner", "messenger", "context_menu"] = "task_runner"
    recipe_id: str | None = None
    node_index: int | None = Field(default=None, ge=0)


def _resolve_provider(pc: ProviderConfig | None) -> tuple[str, str, str]:
    """Resolve base_url, api_key, model from provider config or env fallback.

    Priority: request provider_config > env vars > settings.
    Returns (base_url, api_key, model_name).
    """
    if pc and pc.api_key:
        if pc.provider == "Custom":
            base_url = settings.litellm_api_base + "/v1"
        else:
            base_url = PROVIDER_BASE_URLS.get(pc.provider, "https://openrouter.ai/api/v1")
        return base_url, pc.api_key, pc.model

    # Env var fallback
    env_key = os.environ.get("OPENROUTER_API_KEY", "") or settings.litellm_master_key
    if env_key:
        return "https://openrouter.ai/api/v1", env_key, "anthropic/claude-sonnet-4-6"

    # No key available — will fall through to stub
    return settings.litellm_api_base + "/v1", "", "otto-default"


@router.get("/session")
def get_session(
    vault_id: str,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Get existing session + message history for this vault."""
    session, messages = get_session_with_messages(db, vault_id, user["sub"])

    if not session:
        return {"session": None, "messages": []}

    return {
        "session": {
            "id": session.id,
            "vault_id": session.vault_id,
            "model_used": session.model_used,
            "message_count": session.message_count,
            "total_tokens": session.total_tokens,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "last_message_at": (
                session.last_message_at.isoformat() if session.last_message_at else None
            ),
        },
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "model": m.model,
                "tokens_used": m.tokens_used,
                "enrichment_sources_used": m.enrichment_sources_used,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }


@router.post("/chat")
def otto_chat(
    vault_id: str,
    request: ChatRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> StreamingResponse:
    """Send a message to Otto and receive SSE streaming response."""
    if not is_otto_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Otto AI is temporarily unavailable",
        )

    workspace_id = user.get("workspace_id", "ws_dev")
    user_id = user["sub"]
    user_role = user.get("org_role", "builder")

    # Get or create session
    session = get_or_create_session(db, vault_id, user_id, workspace_id, request.session_id)

    # Save user message
    save_message(db, session, role="user", content=request.message)

    # Build enrichment context — try full agent context, fall back to vault context
    agent_ctx = None
    try:
        agent_ctx = build_user_agent_context(
            db,
            vault_id,
            workspace_id,
            user_id,
            user_role,
            module=request.module or "contracts",
            chamber=request.chamber or "discover",
        )
        ctx = agent_ctx.vault_context
        system_prompt = build_agent_context_prompt(agent_ctx)
    except Exception:
        logger.warning("UserAgentContext build failed, falling back to VaultContext")
        ctx = build_vault_context(db, vault_id, workspace_id, user_id, user_role)
        system_prompt = build_system_prompt(ctx)

    # Resolve provider from request config or env
    base_url, api_key, model_name = _resolve_provider(request.provider_config)

    # Determine enrichment sources used
    sources_used: list[str] = []
    for attr in [
        "gate_state",
        "field_summary",
        "contract_health",
        "domain_rules",
        "preflight_sections",
        "corpus_lines",
        "extraction_meta",
        "patch_summary",
        "deal_fields",
    ]:
        if getattr(ctx, attr) is not None:
            sources_used.append(attr)

    def stream_response() -> Generator[str, None, None]:
        """Generate SSE stream — tries PydanticAI agent, falls back to stub."""
        start_time = time.time()
        full_response = ""

        try:
            # Try to use PydanticAI agent with configured provider
            try:
                if not api_key:
                    raise ValueError("No API key configured")  # noqa: TRY301

                from pydantic_ai import Agent
                from pydantic_ai.models.openai import OpenAIModel

                model = OpenAIModel(
                    model_name,
                    base_url=base_url,
                    api_key=api_key,
                )
                agent = Agent(
                    model=model,
                    system_prompt=system_prompt,
                )
                result = agent.run_sync(request.message)
                full_response = result.data
                logger.info("Otto LLM response via %s/%s", base_url, model_name)

            except Exception:
                logger.info("LLM unavailable (provider=%s), using stub response", base_url)
                full_response = generate_stub_response(request.message, ctx)

            # Stream the response word by word
            words = full_response.split(" ")
            for i, word in enumerate(words):
                token = word if i == 0 else " " + word
                yield format_sse_text(token)

            prompt_tokens = len(request.message.split()) * 2
            completion_tokens = len(words)

            yield format_sse_finish("stop", prompt_tokens, completion_tokens)
            yield format_sse_done()

            # Save assistant message
            elapsed = time.time() - start_time
            logger.info("Otto response in %.1fs (%d tokens)", elapsed, completion_tokens)
            save_message(
                db,
                session,
                role="assistant",
                content=full_response,
                model=model_name,
                tokens_used=completion_tokens,
                enrichment_sources=sources_used,
                finish_reason="stop",
            )

            otto_circuit_breaker.record_success()

        except Exception:
            logger.exception("Otto streaming error")
            otto_circuit_breaker.record_error()
            yield format_sse_error("An internal error occurred. Please try again.")
            yield format_sse_done()

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/session")
def delete_session(
    vault_id: str,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Clear session and messages."""
    success = clear_session(db, vault_id, user["sub"])
    if not success:
        raise HTTPException(status_code=404, detail="No session found")
    return {"status": "cleared"}


# ─── Vault-less general chat ─────────────────────────────────────────

OTTO_GENERAL_SYSTEM_PROMPT = """You are Otto, the AI assistant inside Airlock — an enterprise data operations platform \
for contract lifecycle management.

You are currently in general assistant mode (no vault selected). You can:
- Answer questions about Airlock features and workflows
- Help with platform navigation and configuration
- Provide general guidance on contract management
- Assist with admin and setup tasks

You do NOT have vault-specific enrichment data in this mode. If the user asks about \
specific contract data, suggest they open a vault first.

Keep responses focused, helpful, and concise.
"""


@general_router.post("/chat")
def otto_general_chat(
    request: ChatRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> StreamingResponse:
    """General Otto chat without vault context — used from admin pages."""
    if not is_otto_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Otto AI is temporarily unavailable",
        )

    # Resolve provider from request config or env
    base_url, api_key, model_name = _resolve_provider(request.provider_config)

    def stream_response() -> Generator[str, None, None]:
        start_time = time.time()
        full_response = ""

        try:
            try:
                if not api_key:
                    raise ValueError("No API key configured")  # noqa: TRY301

                from pydantic_ai import Agent
                from pydantic_ai.models.openai import OpenAIModel

                model = OpenAIModel(
                    model_name,
                    base_url=base_url,
                    api_key=api_key,
                )
                agent = Agent(
                    model=model,
                    system_prompt=OTTO_GENERAL_SYSTEM_PROMPT,
                )
                result = agent.run_sync(request.message)
                full_response = result.data
                logger.info("Otto general LLM response via %s/%s", base_url, model_name)

            except Exception:
                logger.info("LLM unavailable (provider=%s), using fallback", base_url)
                full_response = (
                    "**Otto** (general mode)\n\n"
                    "I'm currently unable to connect to the AI provider. "
                    "Please check your API key configuration in the Capability Tree.\n\n"
                    "*Tip: Open a vault for enriched, context-aware analysis.*"
                )

            words = full_response.split(" ")
            for i, word in enumerate(words):
                token = word if i == 0 else " " + word
                yield format_sse_text(token)

            prompt_tokens = len(request.message.split()) * 2
            completion_tokens = len(words)

            yield format_sse_finish("stop", prompt_tokens, completion_tokens)
            yield format_sse_done()

            elapsed = time.time() - start_time
            logger.info("Otto general response in %.1fs (%d tokens)", elapsed, completion_tokens)
            otto_circuit_breaker.record_success()

        except Exception:
            logger.exception("Otto general streaming error")
            otto_circuit_breaker.record_error()
            yield format_sse_error("An internal error occurred. Please try again.")
            yield format_sse_done()

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
