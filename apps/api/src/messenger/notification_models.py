"""Notification preferences model for unified chat."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class NotificationPreferences(Base):
    __tablename__ = "notification_preferences"

    user_id: Mapped[str] = mapped_column(Text, primary_key=True)
    toast_enabled: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    toast_otto: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    toast_people: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    sound_enabled: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    sound_send: Mapped[str] = mapped_column(Text, server_default="default", nullable=False)
    sound_receive: Mapped[str] = mapped_column(Text, server_default="default", nullable=False)
    sound_notification: Mapped[str] = mapped_column(Text, server_default="default", nullable=False)
    overlay_default: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
