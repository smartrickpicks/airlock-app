"""Invite model — magic link invitations to join a workspace."""

from datetime import datetime

from pydantic import BaseModel, EmailStr
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class Invite(Base):
    __tablename__ = "invites"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, server_default="member")
    module_roles: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    invited_by: Mapped[str] = mapped_column(Text, nullable=False)
    accepted_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}", nullable=False)


# -- Pydantic schemas ---------------------------------------------------------


class InviteCreate(BaseModel):
    email: EmailStr
    role: str = "member"
    module_roles: dict = {}


class InviteResponse(BaseModel):
    id: str
    code: str
    email: str
    role: str
    workspace_id: str
    invited_by: str
    accepted_by: str | None = None
    accepted_at: str | None = None
    expires_at: str
    created_at: str

    model_config = {"from_attributes": True}


class InviteValidateResponse(BaseModel):
    workspace_name: str
    inviter_name: str
    email: str
    status: str
    expires_at: str
