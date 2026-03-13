"""OrbitSection model — section blocks for Orbit creator pages.

Each section has a type (hero, bio, gallery, etc.), ordering,
visibility toggle, and freeform JSONB content.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class OrbitSection(Base):
    __tablename__ = "orbit_sections"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    orbit_profile_id: Mapped[str] = mapped_column(
        Text, ForeignKey("orbit_profiles.id", ondelete="CASCADE"), nullable=False
    )
    section_type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False, server_default="")
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    is_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    content: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
