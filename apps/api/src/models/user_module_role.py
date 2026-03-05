"""UserModuleRole model — per-module role assignment."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class UserModuleRole(Base):
    __tablename__ = "user_module_roles"

    user_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id"), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(Text, ForeignKey("workspaces.id"), primary_key=True)
    module_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    module_role: Mapped[str] = mapped_column(String(20), server_default="viewer")
    assigned_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
