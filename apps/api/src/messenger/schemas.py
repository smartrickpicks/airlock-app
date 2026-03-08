"""Messenger Pydantic schemas."""

from pydantic import BaseModel


class CreateConversationRequest(BaseModel):
    name: str | None = None
    conversation_type: str  # vault_thread | dm | team | module
    vault_id: str | None = None
    module_scope: str | None = None
    participant_ids: list[str] = []


class SendMessageRequest(BaseModel):
    content: str
    message_type: str = "text"
    reply_to_id: str | None = None


class ConversationResponse(BaseModel):
    id: str
    name: str | None
    conversation_type: str
    vault_id: str | None
    module_scope: str | None
    chamber: str | None
    last_message_at: str | None
    unread_count: int = 0
    created_at: str | None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str | None
    content: str
    message_type: str
    reply_to_id: str | None
    created_at: str | None
