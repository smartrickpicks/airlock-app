"""VaultMember model — per-vault access control with inheritance."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class VaultMember(Base):
    __tablename__ = "vault_members"

    vault_id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, primary_key=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, server_default="viewer")
    inherited: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
