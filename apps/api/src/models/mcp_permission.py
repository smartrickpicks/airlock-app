"""MCP tool permission model — per-tool risk tiers and role access."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class McpToolPermission(Base):
    __tablename__ = "workspace_mcp_tool_permissions"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    mcp_server_id: Mapped[str] = mapped_column(Text, nullable=False)
    tool_name: Mapped[str] = mapped_column(Text, nullable=False)
    risk_tier: Mapped[str] = mapped_column(Text, server_default="read", nullable=False)
    allowed_org_roles: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    module_scope: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
