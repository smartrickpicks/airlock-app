"""Otto AI routes — SSE streaming chat + session management."""

import logging
import time
from collections.abc import Generator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.otto.agent import build_system_prompt, generate_stub_response
from src.otto.enrichment import build_vault_context
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


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


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

    # Build enrichment context
    ctx = build_vault_context(db, vault_id, workspace_id, user_id, user_role)

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
            # Try to use PydanticAI agent with LiteLLM
            try:
                from pydantic_ai import Agent
                from pydantic_ai.models.openai import OpenAIModel

                model = OpenAIModel(
                    "otto-default",
                    base_url="http://localhost:4000/v1",
                )
                agent = Agent(
                    model=model,
                    system_prompt=build_system_prompt(ctx),
                )
                result = agent.run_sync(request.message)
                full_response = result.data

            except Exception:
                logger.info("PydanticAI/LiteLLM unavailable, using stub response")
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
                model="otto-default",
                tokens_used=completion_tokens,
                enrichment_sources=sources_used,
                finish_reason="stop",
            )

            otto_circuit_breaker.record_success()

        except Exception as e:
            logger.exception("Otto streaming error")
            otto_circuit_breaker.record_error()
            yield format_sse_error(str(e))
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
