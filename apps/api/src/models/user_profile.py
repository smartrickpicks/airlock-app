"""UserProfile model — MAGS profile storage for PI-inferred behavioral profiles.

Per MAGS Phase 1 spec:
- user_profiles is user-scoped (NO workspace_id) — profile belongs to the person
- Drives are stored as JSONB {dominance, extraversion, patience, formality}
- Source tracks how the profile was determined
- mags_config holds archetype, interaction mode, verbosity, etc.
- sovereignty JSONB holds privacy controls (what's visible to whom)
"""

from datetime import datetime

from sqlalchemy import DateTime, Float, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)

    # Profile match
    pi_profile: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "maverick"
    meta_archetype: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "driver", "enforcer", "interpreter"
    confidence: Mapped[float] = mapped_column(Float, nullable=False)

    # Inferred DECF drives
    drives: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # {dominance: 9.0, extraversion: 8.0, patience: 3.0, formality: 2.0}

    # Signal provenance
    source: Mapped[str] = mapped_column(String(50), nullable=False, server_default="conversation")
    # "conversation", "linkedin", "resume", "user_override"

    # Layer 2+ enrichment (grows over time)
    work_dimensions: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    # Future: domain_expertise, preferred_tools, communication_style

    # MAGS config — how Otto behaves for this user
    mags_config: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    # {archetype, interaction_mode, autonomy_ceiling, verbosity, explanation_style}

    # Workspace + cognitive preferences
    workspace_config: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    # {cognitive_mode, information_density, interface_structure, update_pace, explanation_style}

    # Connected signal sources and their metadata
    signals: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    # {conversation: {completed_at, signal_count}, linkedin: {imported_at}, resume: {uploaded_at}}

    # Privacy / sovereignty controls
    sovereignty: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    # {profile_visible: true, drives_visible: false, archetype_visible: true}

    # Standard timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
