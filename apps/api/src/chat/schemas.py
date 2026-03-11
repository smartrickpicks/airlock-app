"""Unified Chat Pydantic schemas."""

from pydantic import BaseModel


class CreateConversationRequest(BaseModel):
    conversation_type: str  # 'otto' | 'dm' | 'group'
    participant_ids: list[str] = []
    topic: str | None = None
    context_type: str | None = None
    context_id: str | None = None
    context_name: str | None = None


class SendMessageRequest(BaseModel):
    content: str | None = None
    message_type: str = "text"  # 'text' | 'gif' | 'system'
    gif_url: str | None = None
    gif_provider: str | None = None
    gif_width: int | None = None
    gif_height: int | None = None
    reply_to_id: str | None = None


class AddReactionRequest(BaseModel):
    emoji: str


class UpdateConversationRequest(BaseModel):
    topic: str | None = None
    archived: bool | None = None
    persona_mode: str | None = None
    muted: bool | None = None
