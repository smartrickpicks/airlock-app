"""OrbitLink model — tracked link-in-bio entries for Orbit pages.

Each link has a title, URL, optional icon, ordering, visibility,
and a click counter for analytics.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class OrbitLink(Base):
    __tablename__ = "orbit_links"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    orbit_profile_id: Mapped[str] = mapped_column(
        Text, ForeignKey("orbit_profiles.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[str | None] = mapped_column(String(32), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    is_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    click_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
