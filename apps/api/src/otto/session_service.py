"""Otto session management — CRUD for sessions and messages."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session
from ulid import ULID

from src.otto.models import OttoMessage, OttoSession


def get_or_create_session(
    db: Session,
    vault_id: str,
    user_id: str,
    workspace_id: str,
    session_id: str | None = None,
) -> OttoSession:
    """Get existing session or create new one."""
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
    return session


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


def clear_session(db: Session, vault_id: str, user_id: str, workspace_id: str) -> bool:
    """Clear session and messages."""
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

    db.query(OttoMessage).filter(OttoMessage.session_id == session.id).delete()
    db.delete(session)
    db.commit()
    return True
