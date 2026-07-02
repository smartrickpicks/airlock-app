"""UserProfileChangelog model — append-only audit trail for profile changes.

Every profile creation, enrichment, override, or reset is logged here.
This table NEVER receives UPDATE or DELETE operations.
"""

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class UserProfileChangelog(Base):
    __tablename__ = "user_profile_changelog"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)

    # Action performed
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    # "created", "enriched", "override", "reset", "reassessed"

    # What triggered this change
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    # "conversation", "linkedin", "resume", "user_override", "behavioral_observation"

    # What changed — snapshot delta
    delta: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # {
    #   before: {pi_profile: "captain", confidence: 0.62},
    #   after:  {pi_profile: "maverick", confidence: 0.88},
    #   reason: "User connected LinkedIn — dominance signal strengthened"
    # }

    # Immutable timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
