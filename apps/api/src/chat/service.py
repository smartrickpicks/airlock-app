"""Unified Chat service — cursor pagination, reactions, search."""

import logging
from datetime import UTC, datetime

from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session
from ulid import ULID

from src.messenger.models import Conversation, ConversationParticipant, Message
from src.messenger.reaction_models import MessageReaction
from src.messenger.service import _resolve_user_names

logger = logging.getLogger(__name__)


def _aggregate_reactions(
    db: Session, message_ids: list[str], current_user_id: str
) -> dict[str, list[dict]]:
    """Aggregate reactions per message: [{emoji, count, userReacted}]."""
    if not message_ids:
        return {}

    reactions = db.query(MessageReaction).filter(MessageReaction.message_id.in_(message_ids)).all()

    # Group by message_id then emoji
    result: dict[str, dict[str, dict]] = {}
    for r in reactions:
        msg_reactions = result.setdefault(r.message_id, {})
        emoji_data = msg_reactions.setdefault(
            r.emoji, {"emoji": r.emoji, "count": 0, "userReacted": False}
        )
        emoji_data["count"] += 1
        if r.user_id == current_user_id:
            emoji_data["userReacted"] = True

    return {mid: list(emojis.values()) for mid, emojis in result.items()}


def _format_conversation(
    conv: Conversation,
    participants_list: list[dict],
    unread_count: int,
    muted: bool,
    last_message: dict | None,
) -> dict:
    """Format a Conversation ORM object into a response dict."""
    return {
        "id": conv.id,
        "type": conv.conversation_type,
        "name": conv.name,
        "moduleId": conv.module_scope,
        "vaultId": conv.vault_id,
        "chamber": conv.chamber,
        "topic": conv.topic,
        "contextType": conv.context_type,
        "contextId": conv.context_id,
        "contextName": conv.context_name,
        "personaMode": conv.persona_mode,
        "archived": conv.archived,
        "participants": participants_list,
        "lastMessage": last_message,
        "unreadCount": unread_count,
        "muted": muted,
        "createdAt": conv.created_at.isoformat() if conv.created_at else None,
        "lastMessageAt": conv.last_message_at.isoformat() if conv.last_message_at else None,
    }


def list_conversations_cursor(
    db: Session,
    workspace_id: str,
    user_id: str,
    cursor: str | None,
    limit: int,
    conv_type: str | None,
    archived: bool,
) -> dict:
    """List conversations with cursor-based pagination on last_message_at."""
    participants = (
        db.query(ConversationParticipant).filter(ConversationParticipant.user_id == user_id).all()
    )

    conv_ids = [p.conversation_id for p in participants]
    if not conv_ids:
        return {"conversations": [], "next_cursor": None, "has_more": False}

    query = db.query(Conversation).filter(
        Conversation.id.in_(conv_ids),
        Conversation.workspace_id == workspace_id,
        Conversation.deleted_at.is_(None),
        Conversation.archived == archived,
    )

    if conv_type:
        query = query.filter(Conversation.conversation_type == conv_type)

    if cursor:
        # cursor is ISO timestamp string for last_message_at keyset pagination
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.filter(
                or_(
                    Conversation.last_message_at < cursor_dt,
                    Conversation.last_message_at.is_(None),
                )
            )
        except ValueError:
            logger.warning("Invalid cursor timestamp: %s", cursor)

    conversations = (
        query.order_by(Conversation.last_message_at.desc().nullslast()).limit(limit + 1).all()
    )

    has_more = len(conversations) > limit
    if has_more:
        conversations = conversations[:limit]

    # Build unread map and muted map
    unread_map = {p.conversation_id: p.unread_count for p in participants}
    muted_map = {p.conversation_id: p.muted for p in participants}

    # Build participants map per conversation
    all_participant_rows = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id.in_([c.id for c in conversations]))
        .all()
    )
    participant_user_ids = list({p.user_id for p in all_participant_rows})
    user_info = _resolve_user_names(db, participant_user_ids)

    conv_participants: dict[str, list[dict]] = {}
    for p in all_participant_rows:
        info = user_info.get(p.user_id, {"name": "Unknown", "avatarUrl": None})
        entry = {
            "userId": p.user_id,
            "name": info["name"] or "Unknown",
            "avatarUrl": info.get("avatarUrl"),
            "online": False,
        }
        conv_participants.setdefault(p.conversation_id, []).append(entry)

    # Build lastMessage map
    last_messages: dict[str, dict] = {}
    for conv_id in [c.id for c in conversations]:
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

    result_convs = [
        _format_conversation(
            conv=c,
            participants_list=conv_participants.get(c.id, []),
            unread_count=unread_map.get(c.id, 0),
            muted=muted_map.get(c.id, False),
            last_message=last_messages.get(c.id),
        )
        for c in conversations
    ]

    next_cursor = None
    if has_more and conversations:
        last_conv = conversations[-1]
        if last_conv.last_message_at:
            next_cursor = last_conv.last_message_at.isoformat()

    return {"conversations": result_convs, "next_cursor": next_cursor, "has_more": has_more}


def create_conversation_chat(
    db: Session,
    workspace_id: str,
    user_id: str,
    request,  # CreateConversationRequest
) -> dict:
    """Create a new conversation with DM dedup for direct messages."""
    # DM dedup: if DM and single other participant, return existing if it exists
    if request.conversation_type == "dm" and len(request.participant_ids) == 1:
        other_user_id = request.participant_ids[0]

        # Find conversations where both users participate
        my_convs = (
            db.query(ConversationParticipant.conversation_id)
            .filter(ConversationParticipant.user_id == user_id)
            .subquery()
        )
        other_convs = (
            db.query(ConversationParticipant.conversation_id)
            .filter(ConversationParticipant.user_id == other_user_id)
            .subquery()
        )

        existing_dm = (
            db.query(Conversation)
            .filter(
                Conversation.id.in_(my_convs),
                Conversation.id.in_(other_convs),
                Conversation.conversation_type == "dm",
                Conversation.workspace_id == workspace_id,
                Conversation.deleted_at.is_(None),
            )
            .first()
        )

        if existing_dm:
            # Return the existing DM conversation
            all_participant_rows = (
                db.query(ConversationParticipant)
                .filter(ConversationParticipant.conversation_id == existing_dm.id)
                .all()
            )
            participant_user_ids = [p.user_id for p in all_participant_rows]
            user_info = _resolve_user_names(db, participant_user_ids)
            participants_list = [
                {
                    "userId": p.user_id,
                    "name": user_info.get(p.user_id, {"name": "Unknown"})["name"] or "Unknown",
                    "avatarUrl": user_info.get(p.user_id, {"avatarUrl": None}).get("avatarUrl"),
                    "online": False,
                }
                for p in all_participant_rows
            ]
            current_participant = next(
                (p for p in all_participant_rows if p.user_id == user_id), None
            )
            return _format_conversation(
                conv=existing_dm,
                participants_list=participants_list,
                unread_count=current_participant.unread_count if current_participant else 0,
                muted=current_participant.muted if current_participant else False,
                last_message=None,
            )

    conv = Conversation(
        id=f"conv_{ULID()}",
        workspace_id=workspace_id,
        name=None,
        conversation_type=request.conversation_type,
        topic=request.topic,
        context_type=request.context_type,
        context_id=request.context_id,
        context_name=request.context_name,
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
    for pid in request.participant_ids:
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

    all_pids = [user_id] + [pid for pid in request.participant_ids if pid != user_id]
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

    return _format_conversation(
        conv=conv,
        participants_list=participants_list,
        unread_count=0,
        muted=False,
        last_message=None,
    )


def update_conversation(
    db: Session,
    conversation_id: str,
    user_id: str,
    request,  # UpdateConversationRequest
) -> dict:
    """Update topic, archived, persona_mode on conversation; muted on participant."""
    conv = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.deleted_at.is_(None),
        )
        .first()
    )
    if not conv:
        return {}

    if request.topic is not None:
        conv.topic = request.topic
    if request.archived is not None:
        conv.archived = request.archived
    if request.persona_mode is not None:
        conv.persona_mode = request.persona_mode

    if request.muted is not None:
        participant = (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id,
            )
            .first()
        )
        if participant:
            participant.muted = request.muted

    db.commit()
    db.refresh(conv)

    all_participant_rows = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == conversation_id)
        .all()
    )
    participant_user_ids = [p.user_id for p in all_participant_rows]
    user_info = _resolve_user_names(db, participant_user_ids)
    participants_list = [
        {
            "userId": p.user_id,
            "name": user_info.get(p.user_id, {"name": "Unknown"})["name"] or "Unknown",
            "avatarUrl": user_info.get(p.user_id, {"avatarUrl": None}).get("avatarUrl"),
            "online": False,
        }
        for p in all_participant_rows
    ]
    current_participant = next((p for p in all_participant_rows if p.user_id == user_id), None)

    return _format_conversation(
        conv=conv,
        participants_list=participants_list,
        unread_count=current_participant.unread_count if current_participant else 0,
        muted=current_participant.muted if current_participant else False,
        last_message=None,
    )


def list_messages_cursor(
    db: Session,
    conversation_id: str,
    cursor: str | None,
    limit: int,
    direction: str,
    current_user_id: str,
) -> dict:
    """List messages with cursor-based pagination using message ID as cursor."""
    query = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.deleted_at.is_(None),
    )

    if cursor:
        # Resolve cursor message to get its created_at timestamp
        cursor_msg = db.query(Message).filter(Message.id == cursor).first()
        if cursor_msg and cursor_msg.created_at:
            if direction == "after":
                query = query.filter(Message.created_at > cursor_msg.created_at)
                query = query.order_by(Message.created_at.asc())
            else:
                # "before" is default
                query = query.filter(Message.created_at < cursor_msg.created_at)
                query = query.order_by(Message.created_at.desc())
        else:
            query = query.order_by(Message.created_at.desc())
    else:
        if direction == "after":
            query = query.order_by(Message.created_at.asc())
        else:
            query = query.order_by(Message.created_at.desc())

    messages = query.limit(limit + 1).all()

    has_more = len(messages) > limit
    if has_more:
        messages = messages[:limit]

    # For "before" direction, reverse so messages are in chronological order
    if direction != "after":
        messages = list(reversed(messages))

    # Batch resolve sender names
    sender_ids = list({m.sender_id for m in messages if m.sender_id})
    user_info = _resolve_user_names(db, sender_ids)

    # Aggregate reactions
    message_ids = [m.id for m in messages]
    reactions_map = _aggregate_reactions(db, message_ids, current_user_id)

    result_messages = [
        {
            "id": m.id,
            "conversationId": m.conversation_id,
            "authorId": m.sender_id,
            "authorName": user_info.get(m.sender_id or "", {"name": "System"})["name"] or "Unknown",
            "content": m.content,
            "messageType": m.message_type,
            "gifUrl": m.gif_url,
            "gifProvider": m.gif_provider,
            "gifWidth": m.gif_width,
            "gifHeight": m.gif_height,
            "replyToId": m.reply_to_id,
            "reactions": reactions_map.get(m.id, []),
            "createdAt": m.created_at.isoformat() if m.created_at else None,
            "readAt": m.read_at.isoformat() if m.read_at else None,
        }
        for m in messages
    ]

    next_cursor = None
    if has_more and messages:
        next_cursor = messages[-1].id if direction == "after" else messages[0].id

    return {"messages": result_messages, "next_cursor": next_cursor, "has_more": has_more}


def send_message_chat(
    db: Session,
    conversation_id: str,
    workspace_id: str,
    sender_id: str,
    request,  # SendMessageRequest
) -> dict:
    """Send a text or GIF message to a conversation."""
    msg = Message(
        id=f"msg_{ULID()}",
        conversation_id=conversation_id,
        workspace_id=workspace_id,
        sender_id=sender_id,
        content=request.content,
        message_type=request.message_type,
        gif_url=request.gif_url,
        gif_provider=request.gif_provider,
        gif_width=request.gif_width,
        gif_height=request.gif_height,
        reply_to_id=request.reply_to_id,
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
        "gifUrl": msg.gif_url,
        "gifProvider": msg.gif_provider,
        "gifWidth": msg.gif_width,
        "gifHeight": msg.gif_height,
        "replyToId": msg.reply_to_id,
        "reactions": [],
        "createdAt": msg.created_at.isoformat() if msg.created_at else None,
        "readAt": None,
    }


def mark_message_read(db: Session, message_id: str, user_id: str) -> bool:
    """Set read_at on the message and update participant's last_read_at."""
    msg = (
        db.query(Message)
        .filter(
            Message.id == message_id,
            Message.deleted_at.is_(None),
        )
        .first()
    )
    if not msg:
        return False

    msg.read_at = datetime.now(UTC)

    # Update participant last_read_at and decrement unread_count
    participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == msg.conversation_id,
            ConversationParticipant.user_id == user_id,
        )
        .first()
    )
    if participant:
        participant.last_read_at = datetime.now(UTC)
        if participant.unread_count > 0:
            participant.unread_count -= 1

    db.commit()
    return True


def add_reaction(db: Session, message_id: str, user_id: str, emoji: str) -> list[dict]:
    """Add a reaction to a message and return the aggregated reaction summary."""
    # Check if reaction already exists
    existing = (
        db.query(MessageReaction)
        .filter(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == user_id,
            MessageReaction.emoji == emoji,
        )
        .first()
    )

    if not existing:
        reaction = MessageReaction(
            id=f"rxn_{ULID()}",
            message_id=message_id,
            user_id=user_id,
            emoji=emoji,
        )
        db.add(reaction)
        db.commit()

    # Return aggregated reactions for this message
    return _aggregate_reactions(db, [message_id], user_id).get(message_id, [])


def remove_reaction(db: Session, message_id: str, user_id: str, emoji: str) -> bool:
    """Remove a reaction from a message."""
    reaction = (
        db.query(MessageReaction)
        .filter(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == user_id,
            MessageReaction.emoji == emoji,
        )
        .first()
    )

    if not reaction:
        return False

    db.delete(reaction)
    db.commit()
    return True


def edit_message(db: Session, message_id: str, sender_id: str, content: str) -> dict | None:
    """Edit a message's content. Only the sender can edit."""
    msg = (
        db.query(Message)
        .filter(
            Message.id == message_id,
            Message.sender_id == sender_id,
            Message.deleted_at.is_(None),
        )
        .first()
    )
    if not msg:
        return None

    msg.content = content
    msg.edited_at = datetime.now(UTC)
    db.commit()
    db.refresh(msg)

    user_info = _resolve_user_names(db, [sender_id])
    author_name = user_info.get(sender_id, {"name": "Unknown"})["name"] or "Unknown"
    reactions = _aggregate_reactions(db, [message_id], sender_id).get(message_id, [])

    return {
        "id": msg.id,
        "conversationId": msg.conversation_id,
        "authorId": msg.sender_id,
        "authorName": author_name,
        "content": msg.content,
        "messageType": msg.message_type,
        "editedAt": msg.edited_at.isoformat() if msg.edited_at else None,
        "reactions": reactions,
        "createdAt": msg.created_at.isoformat() if msg.created_at else None,
    }


def soft_delete_message(db: Session, message_id: str, sender_id: str) -> str | None:
    """Soft-delete a message. Returns conversation_id or None if not found."""
    msg = (
        db.query(Message)
        .filter(
            Message.id == message_id,
            Message.sender_id == sender_id,
            Message.deleted_at.is_(None),
        )
        .first()
    )
    if not msg:
        return None

    conversation_id = msg.conversation_id
    msg.deleted_at = datetime.now(UTC)
    db.commit()
    return conversation_id


def search_messages(
    db: Session, workspace_id: str, user_id: str, query: str, limit: int
) -> list[dict]:
    """Full-text search messages using PostgreSQL tsvector."""
    # Get conversation IDs the user participates in
    conv_ids_rows = (
        db.query(ConversationParticipant.conversation_id)
        .filter(ConversationParticipant.user_id == user_id)
        .all()
    )
    conv_ids = [r.conversation_id for r in conv_ids_rows]

    if not conv_ids:
        return []

    # Use PostgreSQL full-text search
    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id.in_(conv_ids),
            Message.deleted_at.is_(None),
            func.to_tsvector("english", func.coalesce(Message.content, "")).op("@@")(
                func.plainto_tsquery("english", query)
            ),
        )
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )

    sender_ids = list({m.sender_id for m in messages if m.sender_id})
    user_info = _resolve_user_names(db, sender_ids)

    # Get conversation context for matched messages
    matched_conv_ids = list({m.conversation_id for m in messages})
    conversations = db.query(Conversation).filter(Conversation.id.in_(matched_conv_ids)).all()
    conv_map = {c.id: c for c in conversations}

    return [
        {
            "id": m.id,
            "conversationId": m.conversation_id,
            "conversationName": conv_map.get(m.conversation_id, Conversation()).name
            if m.conversation_id in conv_map
            else None,
            "authorId": m.sender_id,
            "authorName": user_info.get(m.sender_id or "", {"name": "System"})["name"] or "Unknown",
            "content": m.content,
            "messageType": m.message_type,
            "createdAt": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


def search_people(db: Session, workspace_id: str, query: str, limit: int) -> list[dict]:
    """Search workspace members by display_name or email."""
    from src.models.user import User

    users = (
        db.query(User)
        .filter(
            User.workspace_id == workspace_id,
            User.deleted_at.is_(None),
            or_(
                User.display_name.ilike(f"%{query}%"),
                User.email.ilike(f"%{query}%"),
            ),
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "userId": u.id,
            "name": u.display_name,
            "email": u.email,
            "avatarUrl": u.avatar_url,
        }
        for u in users
    ]
