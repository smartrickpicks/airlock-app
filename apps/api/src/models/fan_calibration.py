"""FanCalibration model — portable behavioral identity from quiz.

Stores a fan's calibration results: DECF drive scores, quiz answers,
matched persona, confidence level, and shareable card URL.
"""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class FanCalibration(Base):
    __tablename__ = "fan_calibrations"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    fan_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    orbit_profile_id: Mapped[str] = mapped_column(
        Text, ForeignKey("orbit_profiles.id", ondelete="CASCADE"), nullable=False
    )
    persona_id: Mapped[str | None] = mapped_column(
        Text, ForeignKey("orbit_personas.id", ondelete="SET NULL"), nullable=True
    )
    session_token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    drives: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    answers: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="[]")
    confidence: Mapped[float] = mapped_column(Float, nullable=False, server_default="0.0")
    share_card_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
