"""OrbitPersona model — creator-branded PI profile mappings.

Each persona maps a PI behavioral profile to a creator's custom label,
description, and traits for fan-facing display.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class OrbitPersona(Base):
    __tablename__ = "orbit_personas"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    orbit_profile_id: Mapped[str] = mapped_column(
        Text, ForeignKey("orbit_profiles.id", ondelete="CASCADE"), nullable=False
    )
    pi_profile: Mapped[str] = mapped_column(String(32), nullable=False)
    display_name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    traits: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="[]")
    emoji: Mapped[str | None] = mapped_column(String(8), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
