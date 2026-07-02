"""Messenger service — conversation + message CRUD."""

import logging
from datetime import UTC, datetime

from sqlalchemy import desc
from sqlalchemy.orm import Session
from ulid import ULID

from src.messenger.models import Conversation, ConversationParticipant, Message

logger = logging.getLogger(__name__)


def _resolve_user_names(db: Session, user_ids: list[str]) -> dict[str, dict[str, str | None]]:
    """Batch resolve user IDs to display_name and avatar_url."""
    from src.models.user import User

    if not user_ids:
        return {}
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    return {u.id: {"name": u.display_name, "avatarUrl": u.avatar_url} for u in users}


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

    # Build participants map per conversation
    all_participants = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id.in_(conv_ids))
        .all()
    )
    participant_user_ids = list({p.user_id for p in all_participants})
    user_info = _resolve_user_names(db, participant_user_ids)

    conv_participants: dict[str, list[dict]] = {}
    for p in all_participants:
        info = user_info.get(p.user_id, {"name": "Unknown", "avatarUrl": None})
        entry = {
            "userId": p.user_id,
            "name": info["name"] or "Unknown",
            "avatarUrl": info.get("avatarUrl"),
            "online": False,
        }
        conv_participants.setdefault(p.conversation_id, []).append(entry)

    # Build lastMessage map — latest message per conversation
    last_messages: dict[str, dict] = {}
    for conv_id in conv_ids:
        latest_msg = (
            db.query(Message)
            .filter(
                Message.conversation_id == conv_id,
                Message.deleted_at.is_(None),
            )
            .order_by(desc(Message.created_at))
            .first()
        )
        if latest_msg:
            sender_info = user_info.get(
                latest_msg.sender_id or "", {"name": "System", "avatarUrl": None}
            )
            last_messages[conv_id] = {
                "authorName": sender_info["name"] or "Unknown",
                "content": latest_msg.content,
                "timestamp": (latest_msg.created_at.isoformat() if latest_msg.created_at else None),
            }

    return [
        {
            "id": c.id,
            "type": c.conversation_type,
            "name": c.name,
            "moduleId": c.module_scope,
            "vaultId": c.vault_id,
            "chamber": c.chamber,
            "participants": conv_participants.get(c.id, []),
            "lastMessage": last_messages.get(c.id),
            "unreadCount": unread_map.get(c.id, 0),
            "muted": False,
            "createdAt": c.created_at.isoformat() if c.created_at else None,
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

    # Resolve participant info for response
    all_pids = [user_id] + [pid for pid in (participant_ids or []) if pid != user_id]
    user_info = _resolve_user_names(db, all_pids)
    participants_list = [
        {
            "userId": pid,
            "name": user_info.get(pid, {"name": "Unknown"})["name"] or "Unknown",
            "avatarUrl": user_info.get(pid, {"avatarUrl": None}).get("avatarUrl"),
            "online": False,
        }
        for pid in all_pids
    ]

    return {
        "id": conv.id,
        "type": conv.conversation_type,
        "name": conv.name,
        "moduleId": conv.module_scope,
        "vaultId": conv.vault_id,
        "chamber": conv.chamber,
        "participants": participants_list,
        "lastMessage": None,
        "unreadCount": 0,
        "muted": False,
        "createdAt": conv.created_at.isoformat() if conv.created_at else None,
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

    # Batch resolve sender names
    sender_ids = list({m.sender_id for m in messages if m.sender_id})
    user_info = _resolve_user_names(db, sender_ids)

    return [
        {
            "id": m.id,
            "conversationId": m.conversation_id,
            "authorId": m.sender_id,
            "authorName": user_info.get(m.sender_id or "", {"name": "System"})["name"] or "Unknown",
            "content": m.content,
            "messageType": m.message_type,
            "replyToId": m.reply_to_id,
            "createdAt": m.created_at.isoformat() if m.created_at else None,
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

    # Resolve sender name
    user_info = _resolve_user_names(db, [sender_id])
    author_name = user_info.get(sender_id, {"name": "Unknown"})["name"] or "Unknown"

    return {
        "id": msg.id,
        "conversationId": msg.conversation_id,
        "authorId": msg.sender_id,
        "authorName": author_name,
        "content": msg.content,
        "messageType": msg.message_type,
        "replyToId": msg.reply_to_id,
        "createdAt": msg.created_at.isoformat() if msg.created_at else None,
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
