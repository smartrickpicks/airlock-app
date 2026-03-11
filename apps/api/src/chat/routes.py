"""Unified Chat routes — /api/chat/."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.chat.schemas import (
    AddReactionRequest,
    CreateConversationRequest,
    SendMessageRequest,
    UpdateConversationRequest,
)
from src.chat.service import (
    add_reaction,
    create_conversation_chat,
    list_conversations_cursor,
    list_messages_cursor,
    mark_message_read,
    remove_reaction,
    search_messages,
    search_people,
    send_message_chat,
    update_conversation,
)
from src.db import get_db
from src.middleware.auth import get_current_user
from src.realtime.emitter import emit_event

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/conversations")
async def get_conversations(
    cursor: str | None = Query(default=None),  # noqa: B008
    limit: int = Query(default=25, le=50),  # noqa: B008
    type: str | None = Query(default=None),  # noqa: B008
    archived: bool = Query(default=False),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """List conversations with cursor-based pagination."""
    return list_conversations_cursor(
        db,
        workspace_id=user.get("workspace_id", "ws_dev"),
        user_id=user["sub"],
        cursor=cursor,
        limit=limit,
        conv_type=type,
        archived=archived,
    )


@router.post("/conversations")
async def create_new_conversation(
    request: CreateConversationRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Create a new conversation with DM deduplication."""
    return create_conversation_chat(
        db,
        workspace_id=user.get("workspace_id", "ws_dev"),
        user_id=user["sub"],
        request=request,
    )


@router.patch("/conversations/{conversation_id}")
async def patch_conversation(
    conversation_id: str,
    request: UpdateConversationRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Update a conversation's topic, archived state, persona_mode, or muted status."""
    result = update_conversation(
        db,
        conversation_id=conversation_id,
        user_id=user["sub"],
        request=request,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return result


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    cursor: str | None = Query(default=None),  # noqa: B008
    limit: int = Query(default=50, le=100),  # noqa: B008
    direction: str = Query(default="before"),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Get messages for a conversation with cursor-based pagination."""
    return list_messages_cursor(
        db,
        conversation_id=conversation_id,
        cursor=cursor,
        limit=limit,
        direction=direction,
        current_user_id=user["sub"],
    )


@router.post("/conversations/{conversation_id}/messages")
async def post_message(
    conversation_id: str,
    request: SendMessageRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Send a message to a conversation."""
    msg = send_message_chat(
        db,
        conversation_id=conversation_id,
        workspace_id=user.get("workspace_id", "ws_dev"),
        sender_id=user["sub"],
        request=request,
    )
    await emit_event(
        f"messenger:{conversation_id}",
        {"event_type": "message.sent", "message": msg},
    )
    return msg


@router.post("/conversations/{conversation_id}/messages/{message_id}/read")
async def mark_read(
    conversation_id: str,
    message_id: str,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Mark a specific message as read."""
    success = mark_message_read(db, message_id=message_id, user_id=user["sub"])
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"status": "read"}


@router.post("/messages/{message_id}/reactions")
async def add_message_reaction(
    message_id: str,
    request: AddReactionRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Add a reaction to a message."""
    # Look up conversation_id for the broadcast
    from src.messenger.models import Message

    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    result = add_reaction(db, message_id=message_id, user_id=user["sub"], emoji=request.emoji)
    await emit_event(
        f"messenger:{msg.conversation_id}",
        {
            "event_type": "reaction.added",
            "message_id": message_id,
            "reaction": result,
        },
    )
    return {"reactions": result}


@router.delete("/messages/{message_id}/reactions/{emoji}")
async def remove_message_reaction(
    message_id: str,
    emoji: str,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Remove a reaction from a message."""
    success = remove_reaction(db, message_id=message_id, user_id=user["sub"], emoji=emoji)
    if not success:
        raise HTTPException(status_code=404, detail="Reaction not found")
    return {"status": "removed"}


@router.get("/people")
async def search_workspace_people(
    q: str = Query(...),  # noqa: B008
    limit: int = Query(default=20),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Search workspace members by name or email."""
    people = search_people(
        db,
        workspace_id=user.get("workspace_id", "ws_dev"),
        query=q,
        limit=limit,
    )
    return {"people": people}


@router.get("/search")
async def search_chat_messages(
    q: str = Query(...),  # noqa: B008
    limit: int = Query(default=20),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Full-text search messages across conversations."""
    results = search_messages(
        db,
        workspace_id=user.get("workspace_id", "ws_dev"),
        user_id=user["sub"],
        query=q,
        limit=limit,
    )
    return {"messages": results}
