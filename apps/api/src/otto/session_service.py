"""Otto session management — CRUD for sessions and messages.

Integrates with Otto State Service for session lifecycle (warm-start, begin/end).
DB sessions are the source of truth; State Service calls are fire-and-forget.
"""

import logging
import os
from datetime import UTC, datetime

import httpx
from sqlalchemy.orm import Session
from ulid import ULID

from src.otto.models import OttoMessage, OttoSession

logger = logging.getLogger(__name__)

OTTO_STATE_SERVICE_URL = os.environ.get("OTTO_STATE_SERVICE_URL", "http://localhost:8100")


async def _notify_session_begin(user_id: str) -> None:
    """Fire-and-forget: tell State Service a session started."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(
                f"{OTTO_STATE_SERVICE_URL}/persona/sessions/{user_id}/begin",
            )
    except Exception:
        logger.warning("State Service session begin failed for %s", user_id, exc_info=True)


async def _notify_session_end(
    user_id: str,
    summary: str | None = None,
    persona: str | None = None,
    chamber: str | None = None,
) -> None:
    """Fire-and-forget: tell State Service a session ended."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(
                f"{OTTO_STATE_SERVICE_URL}/persona/sessions/{user_id}/end",
                json={
                    "summary": summary or "Session ended",
                    "persona": persona,
                    "chamber": chamber,
                    "open_items": [],
                },
            )
    except Exception:
        logger.warning("State Service session end failed for %s", user_id, exc_info=True)


def get_or_create_session(
    db: Session,
    vault_id: str,
    user_id: str,
    workspace_id: str,
    session_id: str | None = None,
) -> OttoSession:
    """Get existing session or create new one.

    Note: State Service notification is async. Callers in async routes should
    await notify_new_session() after calling this if a new session was created.
    """
    if session_id:
        session = (
            db.query(OttoSession)
            .filter(
                OttoSession.id == session_id,
                OttoSession.user_id == user_id,
                OttoSession.workspace_id == workspace_id,
            )
            .first()
        )
        if session:
            return session

    # Find existing session for this vault+user within workspace
    session = (
        db.query(OttoSession)
        .filter(
            OttoSession.vault_id == vault_id,
            OttoSession.user_id == user_id,
            OttoSession.workspace_id == workspace_id,
        )
        .order_by(OttoSession.last_message_at.desc())
        .first()
    )

    if session:
        return session

    # Create new session
    session = OttoSession(
        id=f"ots_{ULID()}",
        vault_id=vault_id,
        user_id=user_id,
        workspace_id=workspace_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Mark as newly created so callers can trigger async notification
    session._is_new = True  # type: ignore[attr-defined]

    return session


def is_new_session(session: OttoSession) -> bool:
    """Check if session was just created (needs State Service notification)."""
    return getattr(session, "_is_new", False)


async def notify_new_session(user_id: str) -> None:
    """Async helper for callers to notify State Service of a new session."""
    await _notify_session_begin(user_id)


def get_session_with_messages(
    db: Session,
    vault_id: str,
    user_id: str,
    workspace_id: str,
) -> tuple[OttoSession | None, list[OttoMessage]]:
    """Load session and its message history."""
    session = (
        db.query(OttoSession)
        .filter(
            OttoSession.vault_id == vault_id,
            OttoSession.user_id == user_id,
            OttoSession.workspace_id == workspace_id,
        )
        .order_by(OttoSession.last_message_at.desc())
        .first()
    )

    if not session:
        return None, []

    messages = (
        db.query(OttoMessage)
        .filter(OttoMessage.session_id == session.id)
        .order_by(OttoMessage.created_at.asc())
        .all()
    )

    return session, messages


def save_message(
    db: Session,
    session: OttoSession,
    role: str,
    content: str,
    model: str | None = None,
    tokens_used: int | None = None,
    enrichment_sources: list[str] | None = None,
    finish_reason: str | None = None,
    tool_calls: dict | None = None,
    tool_results: dict | None = None,
    tool_name: str | None = None,
) -> OttoMessage:
    """Save a message and update session counters."""
    message = OttoMessage(
        id=f"otm_{ULID()}",
        session_id=session.id,
        role=role,
        content=content,
        model=model,
        tokens_used=tokens_used,
        enrichment_sources_used=enrichment_sources,
        finish_reason=finish_reason,
        tool_calls=tool_calls,
        tool_results=tool_results,
        tool_name=tool_name,
    )
    db.add(message)

    # Update session counters
    session.message_count = (session.message_count or 0) + 1
    session.last_message_at = datetime.now(UTC)
    if tokens_used:
        session.total_tokens = (session.total_tokens or 0) + tokens_used

    db.commit()
    db.refresh(message)
    return message


async def clear_session(db: Session, vault_id: str, user_id: str, workspace_id: str) -> bool:
    """Clear session and messages, notify State Service."""
    session = (
        db.query(OttoSession)
        .filter(
            OttoSession.vault_id == vault_id,
            OttoSession.user_id == user_id,
            OttoSession.workspace_id == workspace_id,
        )
        .first()
    )

    if not session:
        return False

    # Capture before ORM expiry from delete
    uid = session.user_id
    db.query(OttoMessage).filter(OttoMessage.session_id == session.id).delete()
    db.delete(session)
    db.commit()

    # Notify State Service that the session ended
    await _notify_session_end(uid, summary="Session cleared by user")

    return True
