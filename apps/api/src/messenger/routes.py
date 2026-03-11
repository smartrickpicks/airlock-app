"""Messenger routes — conversation + message endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.db import get_db
from src.messenger.schemas import CreateConversationRequest, SendMessageRequest
from src.messenger.service import (
    create_conversation,
    list_conversations,
    list_messages,
    mark_as_read,
    send_message,
)
from src.middleware.auth import get_current_user
from src.realtime.emitter import emit_event

router = APIRouter(prefix="/api/v1/messenger", tags=["messenger"])


@router.get("")
async def get_conversations(
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """List conversations for the current user."""
    conversations = list_conversations(
        db,
        workspace_id=user.get("workspace_id", "ws_dev"),
        user_id=user["sub"],
    )
    return {"conversations": conversations}


@router.post("")
async def create_new_conversation(
    request: CreateConversationRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Create a new conversation."""
    conv = create_conversation(
        db,
        workspace_id=user.get("workspace_id", "ws_dev"),
        user_id=user["sub"],
        name=request.name,
        conversation_type=request.conversation_type,
        vault_id=request.vault_id,
        module_scope=request.module_scope,
        participant_ids=request.participant_ids,
    )
    return conv


@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    limit: int = Query(default=50, le=100),  # noqa: B008
    offset: int = Query(default=0, ge=0),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Get messages for a conversation."""
    messages = list_messages(db, conversation_id, limit=limit, offset=offset)
    return {"messages": messages}


@router.post("/{conversation_id}/messages")
async def post_message(
    conversation_id: str,
    request: SendMessageRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Send a message to a conversation."""
    msg = send_message(
        db,
        conversation_id=conversation_id,
        workspace_id=user.get("workspace_id", "ws_dev"),
        sender_id=user["sub"],
        content=request.content,
        message_type=request.message_type,
        reply_to_id=request.reply_to_id,
    )
    await emit_event(
        f"messenger:{conversation_id}",
        {"event_type": "message.sent", "message": msg},
    )
    return msg


@router.patch("/{conversation_id}/read")
async def mark_conversation_read(
    conversation_id: str,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Mark conversation as read."""
    success = mark_as_read(db, conversation_id, user["sub"])
    if not success:
        raise HTTPException(status_code=404, detail="Not a participant")
    return {"status": "read"}
