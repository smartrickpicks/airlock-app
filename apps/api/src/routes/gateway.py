"""Gateway routes — workspace provisioning, domain verification, integrations, billing."""

import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.config import settings
from src.db import get_db
from src.lib.crypto import encrypt_token
from src.middleware.auth import get_current_user
from src.models.schemas.workspace_config import WorkspaceConfigResponse
from src.models.user import User
from src.models.workspace import Workspace
from src.models.workspace_config import WorkspaceConfig
from src.models.workspace_membership import WorkspaceMembership
from src.services.workspace_resolver import invalidate_domain_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/gateway", tags=["gateway"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class ProvisionWorkspaceRequest(BaseModel):
    """Provision a new workspace with optional config."""

    name: str = Field(..., min_length=1, max_length=255)

    # Domain
    custom_domain: str | None = None

    # Branding
    logo_url: str | None = None
    accent_color: str = "#00d1ff"

    # Modules
    enabled_modules: list[str] = Field(
        default_factory=lambda: ["contracts", "crm", "triage", "calendar", "documents"]
    )

    # AI
    ai_provider: str | None = None
    ai_api_key: str | None = None  # plain-text; encrypted before storage
    ai_tier: str = "none"

    # Google Workspace
    google_refresh_token: str | None = None  # plain-text; encrypted before storage
    google_scopes_granted: list[str] | None = None

    # Limits
    max_users: int = 999
    max_vaults: int = 999

    metadata: dict = Field(default_factory=dict)


class ProvisionWorkspaceResponse(BaseModel):
    """Response after provisioning a workspace."""

    workspace_id: str
    workspace_slug: str
    config: WorkspaceConfigResponse


class GoogleConnectRequest(BaseModel):
    """Request to store Google Workspace credentials."""

    refresh_token: str
    scopes: list[str]


class GoogleStatusResponse(BaseModel):
    """Google Workspace connection status."""

    connected: bool
    scopes_granted: list[str] | None = None


class BillingSubscribeRequest(BaseModel):
    """Request to create a billing subscription."""

    plan: str = "pro"
    payment_method_id: str | None = None


class BillingResponse(BaseModel):
    """Billing operation response."""

    status: str
    message: str
    stripe_subscription_id: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _slugify(name: str) -> str:
    """Convert workspace name to URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def _config_to_response(config: WorkspaceConfig) -> WorkspaceConfigResponse:
    """Convert a WorkspaceConfig ORM object to a response schema."""
    return WorkspaceConfigResponse(
        id=config.id,
        workspace_id=config.workspace_id,
        custom_domain=config.custom_domain,
        vercel_domain=config.vercel_domain,
        domain_verified=config.domain_verified,
        logo_url=config.logo_url,
        accent_color=config.accent_color,
        enabled_modules=config.enabled_modules,
        ai_provider=config.ai_provider,
        ai_tier=config.ai_tier,
        has_ai_key=config.ai_api_key_encrypted is not None,
        google_scopes_granted=config.google_scopes_granted,
        has_google_token=config.google_refresh_token_encrypted is not None,
        billing_tier=config.billing_tier,
        stripe_customer_id=config.stripe_customer_id,
        stripe_subscription_id=config.stripe_subscription_id,
        max_users=config.max_users,
        max_vaults=config.max_vaults,
        metadata=config.metadata_,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


def _get_workspace_config_or_404(workspace_id: str, db: Session) -> WorkspaceConfig:
    """Fetch workspace config or raise 404."""
    config = db.execute(
        select(WorkspaceConfig).where(
            WorkspaceConfig.workspace_id == workspace_id,
            WorkspaceConfig.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace config not found",
        )
    return config


# ---------------------------------------------------------------------------
# POST /api/v1/gateway/workspaces — provision workspace
# ---------------------------------------------------------------------------


@router.post(
    "/workspaces",
    status_code=status.HTTP_201_CREATED,
    response_model=ProvisionWorkspaceResponse,
)
async def provision_workspace(
    payload: ProvisionWorkspaceRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> ProvisionWorkspaceResponse:
    """Create workspace + workspace_config. Called by the gateway wizard."""
    slug = _slugify(payload.name)

    # Check slug uniqueness
    existing = db.execute(
        select(Workspace).where(Workspace.slug == slug, Workspace.deleted_at.is_(None))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Workspace with slug '{slug}' already exists",
        )

    workspace_id = str(ULID())
    config_id = str(ULID())

    # 1. Create workspace
    workspace = Workspace(id=workspace_id, name=payload.name, slug=slug)
    db.add(workspace)

    # 2. Create workspace config
    config = WorkspaceConfig(
        id=config_id,
        workspace_id=workspace_id,
        custom_domain=payload.custom_domain,
        logo_url=payload.logo_url,
        accent_color=payload.accent_color,
        enabled_modules=payload.enabled_modules,
        ai_provider=payload.ai_provider,
        ai_tier=payload.ai_tier,
        max_users=payload.max_users,
        max_vaults=payload.max_vaults,
        metadata_=payload.metadata,
    )

    # Encrypt sensitive tokens before storage
    if payload.ai_api_key:
        config.ai_api_key_encrypted = encrypt_token(payload.ai_api_key)

    if payload.google_refresh_token:
        config.google_refresh_token_encrypted = encrypt_token(payload.google_refresh_token)
        config.google_scopes_granted = payload.google_scopes_granted

    db.add(config)

    # 3. Assign creator as architect in workspace membership
    user_id = current_user.get("sub")
    if user_id:
        membership_id = str(ULID())
        membership = WorkspaceMembership(
            id=membership_id,
            workspace_id=workspace_id,
            user_id=user_id,
            org_role="architect",
        )
        db.add(membership)

        # Update user's workspace_id and org_role
        user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if user:
            user.workspace_id = workspace_id
            user.org_role = "executive"

    db.commit()
    db.refresh(config)

    return ProvisionWorkspaceResponse(
        workspace_id=workspace_id,
        workspace_slug=slug,
        config=_config_to_response(config),
    )


# ---------------------------------------------------------------------------
# GET /api/v1/gateway/workspaces — list user's workspaces
# ---------------------------------------------------------------------------


@router.get("/workspaces", response_model=list[WorkspaceConfigResponse])
async def list_my_workspaces(
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> list[WorkspaceConfigResponse]:
    """List all workspaces the current user is a member of."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User identity not found",
        )

    # Query workspace memberships, join workspace_config
    memberships = (
        db.execute(
            select(WorkspaceMembership.workspace_id).where(
                WorkspaceMembership.user_id == user_id,
                WorkspaceMembership.deleted_at.is_(None),
            )
        )
        .scalars()
        .all()
    )

    if not memberships:
        return []

    configs = (
        db.execute(
            select(WorkspaceConfig).where(
                WorkspaceConfig.workspace_id.in_(memberships),
                WorkspaceConfig.deleted_at.is_(None),
            )
        )
        .scalars()
        .all()
    )

    return [_config_to_response(c) for c in configs]


# ---------------------------------------------------------------------------
# POST /api/v1/gateway/workspaces/{workspace_id}/domain/verify
# ---------------------------------------------------------------------------


@router.post("/workspaces/{workspace_id}/domain/verify")
async def verify_domain(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> dict:
    """Check if custom domain DNS has propagated.

    In production: would call Vercel API to check domain status.
    For now: returns current domain_verified status.
    """
    config = _get_workspace_config_or_404(workspace_id, db)

    if not config.custom_domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No custom domain configured for this workspace",
        )

    # TODO: In production, call Vercel API to check DNS propagation
    # For now, just return the current status
    return {
        "domain": config.custom_domain,
        "verified": config.domain_verified,
        "message": "Domain verification check complete",
    }


# ---------------------------------------------------------------------------
# POST /api/v1/gateway/workspaces/{workspace_id}/google/connect
# ---------------------------------------------------------------------------


@router.post("/workspaces/{workspace_id}/google/connect", response_model=GoogleStatusResponse)
async def connect_google_workspace(
    workspace_id: str,
    body: GoogleConnectRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> GoogleStatusResponse:
    """Store encrypted Google refresh token + scopes."""
    config = _get_workspace_config_or_404(workspace_id, db)

    # Encrypt and store
    config.google_refresh_token_encrypted = encrypt_token(body.refresh_token)
    config.google_scopes_granted = body.scopes

    db.commit()
    db.refresh(config)

    # Invalidate domain cache if custom domain is set
    if config.custom_domain:
        await invalidate_domain_cache(config.custom_domain)

    return GoogleStatusResponse(
        connected=True,
        scopes_granted=config.google_scopes_granted,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/gateway/workspaces/{workspace_id}/google/status
# ---------------------------------------------------------------------------


@router.get("/workspaces/{workspace_id}/google/status", response_model=GoogleStatusResponse)
async def google_connection_status(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> GoogleStatusResponse:
    """Return which Google scopes are active."""
    config = _get_workspace_config_or_404(workspace_id, db)

    return GoogleStatusResponse(
        connected=config.google_refresh_token_encrypted is not None,
        scopes_granted=config.google_scopes_granted,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/gateway/workspaces/{workspace_id}/billing/subscribe
# ---------------------------------------------------------------------------


@router.post(
    "/workspaces/{workspace_id}/billing/subscribe",
    response_model=BillingResponse,
)
async def create_subscription(
    workspace_id: str,
    body: BillingSubscribeRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> BillingResponse:
    """Create Stripe subscription. NOOP when FEATURE_BILLING=false."""
    if not settings.feature_billing:
        return BillingResponse(
            status="beta",
            message="Billing disabled during beta",
        )

    config = _get_workspace_config_or_404(workspace_id, db)

    # TODO: Implement Stripe subscription creation
    # 1. Create Stripe customer if not exists
    # 2. Create subscription with payment method
    # 3. Store stripe_customer_id and stripe_subscription_id
    return BillingResponse(
        status="pending",
        message="Stripe integration not yet implemented",
        stripe_subscription_id=config.stripe_subscription_id,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/gateway/billing/webhook
# ---------------------------------------------------------------------------


@router.post("/billing/webhook")
async def stripe_webhook(
    request: Request,
) -> dict:
    """Stripe webhook handler. NOOP when FEATURE_BILLING=false."""
    if not settings.feature_billing:
        return {"status": "ignored", "message": "Billing disabled during beta"}

    # TODO: Implement Stripe webhook handling
    # 1. Verify webhook signature with Stripe secret
    # 2. Parse event type (invoice.paid, subscription.updated, etc.)
    # 3. Update workspace_config billing fields accordingly
    logger.info("Stripe webhook received (not yet implemented)")
    return {"status": "received"}
