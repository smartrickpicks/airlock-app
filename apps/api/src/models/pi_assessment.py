"""PIAssessment model — per-user PI personality profile and UX preferences."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class PIAssessment(Base):
    __tablename__ = "pi_assessments"
    __table_args__ = (
        UniqueConstraint("user_id", "workspace_id", name="uq_pi_assessment_user_workspace"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id"), nullable=False)
    workspace_id: Mapped[str] = mapped_column(
        Text, ForeignKey("workspaces.id"), nullable=False, index=True
    )
    pi_profile: Mapped[str] = mapped_column(String(30), nullable=False)
    meta_archetype: Mapped[str] = mapped_column(String(20), nullable=False)
    behavioral_factors: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    ux_preferences: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    assessment_source: Mapped[str] = mapped_column(
        String(30), server_default="admin_assigned", nullable=False
    )
    assessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
