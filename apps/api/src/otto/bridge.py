"""Bridge Otto SSE responses to WebSocket for multi-participant visibility."""

import logging

from src.realtime.emitter import emit_event

logger = logging.getLogger(__name__)


async def bridge_otto_response_to_ws(
    conversation_id: str | None,
    message_id: str,
    content: str,
    persona_mode: str | None = None,
) -> None:
    """Broadcast Otto's completed response via WebSocket.

    Called after Otto's full response is persisted. The SSE caller
    already has the message via SSE — this broadcast is for other
    participants in the conversation.
    """
    if not conversation_id:
        return

    await emit_event(
        f"chat:{conversation_id}",
        {
            "event_type": "message.sent",
            "message": {
                "id": message_id,
                "conversationId": conversation_id,
                "authorId": "otto",
                "authorName": "Otto",
                "content": content,
                "messageType": "text",
                "personaMode": persona_mode,
                "createdAt": None,
            },
        },
    )


async def emit_otto_typing(conversation_id: str | None) -> None:
    """Emit typing indicator when Otto starts generating."""
    if not conversation_id:
        return

    await emit_event(
        f"chat:{conversation_id}:typing",
        {
            "event_type": "typing.start",
            "user_id": "otto",
            "user_name": "Otto",
            "conversation_id": conversation_id,
        },
    )
