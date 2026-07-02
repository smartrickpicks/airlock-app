"""Messenger models — conversations, participants, messages."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    vault_id: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    conversation_type: Mapped[str] = mapped_column(Text, nullable=False)
    module_scope: Mapped[str | None] = mapped_column(Text, nullable=True)
    chamber: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    topic: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    persona_mode: Mapped[str | None] = mapped_column(Text, server_default="scholar", nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    conversation_id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, primary_key=True)
    role: Mapped[str] = mapped_column(Text, server_default="member", nullable=False)
    unread_count: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    muted: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    sender_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_type: Mapped[str] = mapped_column(Text, server_default="text", nullable=False)
    gif_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    gif_provider: Mapped[str | None] = mapped_column(Text, nullable=True)
    gif_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gif_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    embeds: Mapped[list] = mapped_column(JSONB, server_default="[]", nullable=False)
    persona_mode: Mapped[str | None] = mapped_column(Text, nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reply_to_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
