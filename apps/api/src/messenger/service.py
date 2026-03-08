"""Messenger service — conversation + message CRUD."""

import logging
from datetime import UTC, datetime

from sqlalchemy.orm import Session
from ulid import ULID

from src.messenger.models import Conversation, ConversationParticipant, Message

logger = logging.getLogger(__name__)


def list_conversations(db: Session, workspace_id: str, user_id: str) -> list[dict]:
    """List conversations the user participates in."""
    participants = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.user_id == user_id,
        )
        .all()
    )

    conv_ids = [p.conversation_id for p in participants]
    if not conv_ids:
        return []

    conversations = (
        db.query(Conversation)
        .filter(
            Conversation.id.in_(conv_ids),
            Conversation.workspace_id == workspace_id,
            Conversation.deleted_at.is_(None),
        )
        .order_by(Conversation.last_message_at.desc().nullslast())
        .all()
    )

    # Build unread map
    unread_map = {p.conversation_id: p.unread_count for p in participants}

    return [
        {
            "id": c.id,
            "name": c.name,
            "conversation_type": c.conversation_type,
            "vault_id": c.vault_id,
            "module_scope": c.module_scope,
            "chamber": c.chamber,
            "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
            "unread_count": unread_map.get(c.id, 0),
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in conversations
    ]


def create_conversation(
    db: Session,
    workspace_id: str,
    user_id: str,
    name: str | None,
    conversation_type: str,
    vault_id: str | None = None,
    module_scope: str | None = None,
    participant_ids: list[str] | None = None,
) -> dict:
    """Create a new conversation."""
    conv = Conversation(
        id=f"conv_{ULID()}",
        workspace_id=workspace_id,
        vault_id=vault_id,
        name=name,
        conversation_type=conversation_type,
        module_scope=module_scope,
        created_by=user_id,
    )
    db.add(conv)

    # Add creator as owner
    db.add(
        ConversationParticipant(
            conversation_id=conv.id,
            user_id=user_id,
            role="owner",
        )
    )

    # Add other participants
    for pid in participant_ids or []:
        if pid != user_id:
            db.add(
                ConversationParticipant(
                    conversation_id=conv.id,
                    user_id=pid,
                    role="member",
                )
            )

    db.commit()
    db.refresh(conv)

    return {
        "id": conv.id,
        "name": conv.name,
        "conversation_type": conv.conversation_type,
        "vault_id": conv.vault_id,
        "module_scope": conv.module_scope,
        "chamber": conv.chamber,
        "last_message_at": None,
        "unread_count": 0,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
    }


def list_messages(
    db: Session, conversation_id: str, limit: int = 50, offset: int = 0
) -> list[dict]:
    """List messages in a conversation."""
    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id,
            Message.deleted_at.is_(None),
        )
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": m.id,
            "conversation_id": m.conversation_id,
            "sender_id": m.sender_id,
            "content": m.content,
            "message_type": m.message_type,
            "reply_to_id": m.reply_to_id,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


def send_message(
    db: Session,
    conversation_id: str,
    workspace_id: str,
    sender_id: str,
    content: str,
    message_type: str = "text",
    reply_to_id: str | None = None,
) -> dict:
    """Send a message to a conversation."""
    msg = Message(
        id=f"msg_{ULID()}",
        conversation_id=conversation_id,
        workspace_id=workspace_id,
        sender_id=sender_id,
        content=content,
        message_type=message_type,
        reply_to_id=reply_to_id,
    )
    db.add(msg)

    # Update conversation last_message_at
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        conv.last_message_at = datetime.now(UTC)

    # Increment unread for other participants
    db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id != sender_id,
    ).update({"unread_count": ConversationParticipant.unread_count + 1})

    db.commit()
    db.refresh(msg)

    return {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_id": msg.sender_id,
        "content": msg.content,
        "message_type": msg.message_type,
        "reply_to_id": msg.reply_to_id,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


def mark_as_read(db: Session, conversation_id: str, user_id: str) -> bool:
    """Mark conversation as read for user."""
    participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
        .first()
    )

    if not participant:
        return False

    participant.unread_count = 0
    participant.last_read_at = datetime.now(UTC)
    db.commit()
    return True
