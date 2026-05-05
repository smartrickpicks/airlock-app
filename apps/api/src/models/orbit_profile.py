"""OrbitProfile model — public creator page identity.

Extends a user with a slug-based public page, brand theming,
and sections/links/personas for the Orbit creator platform.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class OrbitProfile(Base):
    __tablename__ = "orbit_profiles"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False, server_default="")
    tagline: Mapped[str] = mapped_column(String(256), nullable=False, server_default="")
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Brand configuration
    brand_pillars: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="[]")
    theme: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        server_default='{"primary_color": "#8e6bc7", "accent_color": "#e8bcfd", "layout_preset": "default"}',
    )

    # State flags
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    spellcast_completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    page_views: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    # Standard timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
