"""Pydantic schemas for MAGS profile storage.

Handles CRUD operations on user profiles:
- Creating profiles from BMY inference results
- Enriching profiles with LinkedIn/resume data
- User overrides
- Sovereignty (privacy) controls
- Workspace membership management
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from src.schemas.inference import DECFDrives, MetaArchetype, WorkspaceConfig

# --- Enums ---


class ProfileSource(StrEnum):
    """How the profile was determined."""

    CONVERSATION = "conversation"
    LINKEDIN = "linkedin"
    RESUME = "resume"
    USER_OVERRIDE = "user_override"
    BEHAVIORAL = "behavioral"


class ChangelogAction(StrEnum):
    """Profile changelog actions."""

    CREATED = "created"
    ENRICHED = "enriched"
    OVERRIDE = "override"
    RESET = "reset"
    REASSESSED = "reassessed"


class OrgRole(StrEnum):
    """Organization-level roles within a workspace."""

    ARCHITECT = "architect"
    CONTROLLER = "controller"
    MEMBER = "member"
    GUEST = "guest"


# --- Request Schemas ---


class CreateProfileRequest(BaseModel):
    """Create a new user profile from BMY inference results."""

    pi_profile: str = Field(description="Matched profile ID (e.g., 'maverick')")
    meta_archetype: MetaArchetype
    confidence: float = Field(ge=0.0, le=1.0)
    drives: DECFDrives
    source: ProfileSource = ProfileSource.CONVERSATION
    workspace_config: WorkspaceConfig | None = None
    mags_config: dict = Field(default_factory=dict)
    signals: dict = Field(default_factory=dict)


class EnrichProfileRequest(BaseModel):
    """Enrich an existing profile with additional signal data."""

    source: ProfileSource
    drives: DECFDrives | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    pi_profile: str | None = None
    meta_archetype: MetaArchetype | None = None
    workspace_config: WorkspaceConfig | None = None
    mags_config: dict | None = None
    additional_signals: dict = Field(default_factory=dict)


class OverrideProfileRequest(BaseModel):
    """User manually selects a different profile."""

    pi_profile: str = Field(description="User-chosen profile ID")
    reason: str | None = Field(
        default=None, max_length=500, description="Why the user chose this profile"
    )


class UpdateSovereigntyRequest(BaseModel):
    """Update privacy/sovereignty controls."""

    profile_visible: bool | None = None
    drives_visible: bool | None = None
    archetype_visible: bool | None = None
    export_allowed: bool | None = None


class CreateWorkspaceMembershipRequest(BaseModel):
    """Add a user to a workspace."""

    workspace_id: str
    user_id: str
    org_role: OrgRole = OrgRole.MEMBER
    module_roles: dict = Field(default_factory=dict)


class UpdateWorkspaceMembershipRequest(BaseModel):
    """Update a workspace membership."""

    org_role: OrgRole | None = None
    module_roles: dict | None = None
    team_type_visible: bool | None = None
    drives_visible: bool | None = None


# --- Response Schemas ---


class ProfileResponse(BaseModel):
    """User profile response."""

    id: str
    user_id: str
    pi_profile: str
    meta_archetype: str
    confidence: float
    drives: dict
    source: str
    workspace_config: dict
    mags_config: dict
    signals: dict
    sovereignty: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProfileSummaryResponse(BaseModel):
    """Lightweight profile summary (for lists, team views)."""

    user_id: str
    pi_profile: str
    meta_archetype: str
    confidence: float
    drives: dict

    model_config = {"from_attributes": True}


class ChangelogEntryResponse(BaseModel):
    """Single changelog entry."""

    id: str
    user_id: str
    action: str
    source: str
    delta: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class ChangelogResponse(BaseModel):
    """Paginated changelog."""

    entries: list[ChangelogEntryResponse]
    total: int


class WorkspaceMembershipResponse(BaseModel):
    """Workspace membership response."""

    id: str
    workspace_id: str
    user_id: str
    org_role: str
    module_roles: dict
    team_type_visible: bool
    drives_visible: bool
    soft_locks: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceMembershipListResponse(BaseModel):
    """List of workspace memberships."""

    memberships: list[WorkspaceMembershipResponse]
    total: int
