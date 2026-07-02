"""Vault routes — CRUD, hierarchy traversal, chamber progression, approvals."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.schemas.vault import (
    CreateVaultFromDocumentRequest,
    CreateVaultRequest,
    UpdateVaultRequest,
    VaultListResponse,
    VaultResponse,
)
from src.services.approval_service import (
    get_approval_state,
    record_approval,
)
from src.services.chamber_rules import (
    TransitionResult,
    check_build_to_review,
    check_discover_to_build,
    check_review_to_ship,
)
from src.services.document import get_document
from src.services.event import create_event
from src.services.permissions import check_chamber_advance_permission
from src.services.vault import (
    CHAMBER_ORDER,
    VALID_CHAMBERS,
    advance_chamber,
    archive_vault,
    create_vault,
    get_vault,
    get_vault_children,
    list_vaults,
    update_vault,
)
from src.services.vault_membership import get_user_vault_role

# ---------------------------------------------------------------------------
# Pydantic models for approval endpoints
# ---------------------------------------------------------------------------


class ApprovalResponse(BaseModel):
    vault_id: str
    role: str
    approved: bool
    approved_by: str | None = None
    approved_at: str | None = None


class ApprovalState(BaseModel):
    gatekeeper_approved: bool = False
    gatekeeper_approved_by: str | None = None
    gatekeeper_approved_at: str | None = None
    owner_approved: bool = False
    owner_approved_by: str | None = None
    owner_approved_at: str | None = None


# Mapping: (from_chamber, to_chamber) → rule check function
_TRANSITION_CHECKS = {
    ("discover", "build"): check_discover_to_build,
    ("build", "review"): check_build_to_review,
    ("review", "ship"): check_review_to_ship,
}

router = APIRouter(prefix="/api/v1/vaults", tags=["vaults"])


def _vault_to_response(vault) -> VaultResponse:
    return VaultResponse(
        id=vault.id,
        workspace_id=vault.workspace_id,
        parent_vault_id=vault.parent_vault_id,
        vault_level=vault.vault_level,
        name=vault.name,
        slug=vault.slug,
        vault_type=vault.vault_type,
        module_type=vault.module_type,
        chamber=vault.chamber,
        gate=vault.gate,
        metadata=vault.metadata_,
        health_score=vault.health_score,
        created_at=vault.created_at,
        updated_at=vault.updated_at,
        archived_at=vault.archived_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_vault_route(
    body: CreateVaultRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Create a new vault."""
    vault = create_vault(
        db,
        workspace_id=current_user.get("workspace_id", ""),
        name=body.name,
        vault_type=body.vault_type,
        vault_level=body.vault_level,
        parent_vault_id=body.parent_vault_id,
        module_type=body.module_type,
        metadata=body.metadata,
        creator_id=current_user.get("sub"),
    )
    create_event(
        db,
        vault_id=vault.id,
        workspace_id=vault.workspace_id,
        event_type="vault_created",
        actor_id=current_user.get("sub"),
        payload={"name": vault.name, "vault_type": vault.vault_type, "chamber": vault.chamber},
    )
    return _vault_to_response(vault)


@router.post("/from-document", status_code=status.HTTP_201_CREATED)
def create_vault_from_document_route(
    body: CreateVaultFromDocumentRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Create a vault linked to an uploaded document with extraction metadata."""
    workspace_id = current_user.get("workspace_id", "")

    # Validate document exists
    doc = get_document(db, body.document_id, workspace_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Detect contract type from metadata
    contract_type = body.metadata.get("contract_type", "contract")

    vault = create_vault(
        db,
        workspace_id=workspace_id,
        name=body.name,
        vault_type="contract",
        vault_level=4,
        module_type="contracts",
        metadata=body.metadata,
        creator_id=current_user.get("sub"),
    )

    # Compute health score from preflight if available
    preflight = body.metadata.get("preflight_result")
    if isinstance(preflight, dict):
        score = preflight.get("health_score", {})
        if isinstance(score, dict) and "calibrated_score" in score:
            vault.health_score = round(score["calibrated_score"] * 100, 1)

    # Link document to vault
    doc.vault_id = vault.id
    db.commit()
    db.refresh(vault)

    create_event(
        db,
        vault_id=vault.id,
        workspace_id=vault.workspace_id,
        event_type="vault_created",
        actor_id=current_user.get("sub"),
        payload={
            "name": vault.name,
            "vault_type": "contract",
            "chamber": vault.chamber,
            "contract_type": contract_type,
            "document_id": body.document_id,
        },
    )
    return _vault_to_response(vault)


@router.get("")
def list_vaults_route(
    module_type: str | None = Query(default=None),  # noqa: B008
    vault_level: int | None = Query(default=None, ge=1, le=4),  # noqa: B008
    chamber: str | None = Query(default=None),  # noqa: B008
    parent_vault_id: str | None = Query(default=None),  # noqa: B008
    limit: int = Query(default=50, ge=1, le=200),  # noqa: B008
    offset: int = Query(default=0, ge=0),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultListResponse:
    """List vaults with optional filters."""
    workspace_id = current_user.get("workspace_id", "")
    vaults = list_vaults(
        db,
        workspace_id,
        module_type=module_type,
        vault_level=vault_level,
        chamber=chamber,
        parent_vault_id=parent_vault_id,
        limit=limit,
        offset=offset,
    )
    return VaultListResponse(
        vaults=[_vault_to_response(v) for v in vaults],
        total=len(vaults),
    )


@router.get("/{vault_id}")
def get_vault_route(
    vault_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Get a single vault by ID."""
    workspace_id = current_user.get("workspace_id", "")
    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found")
    return _vault_to_response(vault)


@router.get("/{vault_id}/children")
def get_vault_children_route(
    vault_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultListResponse:
    """Get direct children of a vault."""
    workspace_id = current_user.get("workspace_id", "")
    children = get_vault_children(db, vault_id, workspace_id)
    return VaultListResponse(
        vaults=[_vault_to_response(v) for v in children],
        total=len(children),
    )


@router.patch("/{vault_id}")
def update_vault_route(
    vault_id: str,
    body: UpdateVaultRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Update a vault's name, metadata, or parent."""
    workspace_id = current_user.get("workspace_id", "")
    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found")

    kwargs = {}
    if body.name is not None:
        kwargs["name"] = body.name
    if body.metadata is not None:
        kwargs["metadata"] = body.metadata
    if body.parent_vault_id is not None:
        kwargs["parent_vault_id"] = body.parent_vault_id

    vault = update_vault(db, vault, **kwargs)
    return _vault_to_response(vault)


@router.post("/{vault_id}/advance")
def advance_chamber_route(
    vault_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Advance a vault to the next chamber. Requires sufficient role."""
    workspace_id = current_user.get("workspace_id", "")
    user_id = current_user.get("sub")
    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found")

    # Check role-based permission for chamber advancement
    user_role = get_user_vault_role(db, user_id, vault_id, workspace_id)
    if user_role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No membership on this vault",
        )
    if not check_chamber_advance_permission(user_role, vault.chamber):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user_role}' cannot advance vault from '{vault.chamber}' chamber",
        )

    # Determine the next chamber and run gate rule checks
    current_chamber = vault.chamber
    if current_chamber and current_chamber in CHAMBER_ORDER:
        current_idx = CHAMBER_ORDER[current_chamber]
        if current_idx < len(VALID_CHAMBERS) - 1:
            next_chamber = VALID_CHAMBERS[current_idx + 1]
            check_fn = _TRANSITION_CHECKS.get((current_chamber, next_chamber))
            if check_fn is not None:
                result, reasons = check_fn(db, vault, workspace_id)
                if result == TransitionResult.BLOCKED:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail={
                            "message": f"Cannot advance from {current_chamber} to {next_chamber}",
                            "unmet_requirements": reasons,
                        },
                    )

    try:
        vault = advance_chamber(db, vault)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None
    create_event(
        db,
        vault_id=vault.id,
        workspace_id=vault.workspace_id,
        event_type="chamber_advanced",
        actor_id=user_id,
        payload={"chamber": vault.chamber, "gate": vault.gate},
    )
    return _vault_to_response(vault)


# ---------------------------------------------------------------------------
# Approval endpoints
# ---------------------------------------------------------------------------


@router.post("/{vault_id}/approve")
def approve_vault_route(
    vault_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> ApprovalResponse:
    """Record an approval for the current user's role on a vault."""
    workspace_id = current_user.get("workspace_id", "")
    user_id = current_user.get("sub")

    user_role = get_user_vault_role(db, user_id, vault_id, workspace_id)
    if user_role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No membership on this vault",
        )
    if user_role not in ("gatekeeper", "owner"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user_role}' cannot approve vaults",
        )

    try:
        approvals = record_approval(db, vault_id, user_id, user_role, workspace_id)
    except LookupError:
        raise HTTPException(  # noqa: B904
            status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found"
        )

    create_event(
        db,
        vault_id=vault_id,
        workspace_id=workspace_id,
        event_type="vault_approved",
        actor_id=user_id,
        payload={"role": user_role},
    )

    return ApprovalResponse(
        vault_id=vault_id,
        role=user_role,
        approved=True,
        approved_by=approvals.get(f"{user_role}_approved_by"),
        approved_at=approvals.get(f"{user_role}_approved_at"),
    )


@router.get("/{vault_id}/approvals")
def get_vault_approvals_route(
    vault_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> ApprovalState:
    """Get the current approval state for a vault."""
    workspace_id = current_user.get("workspace_id", "")

    try:
        state = get_approval_state(db, vault_id, workspace_id)
    except LookupError:
        raise HTTPException(  # noqa: B904
            status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found"
        )

    return ApprovalState(**state)


@router.post("/{vault_id}/archive")
def archive_vault_route(
    vault_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Soft-delete a vault. Requires owner role."""
    workspace_id = current_user.get("workspace_id", "")
    user_id = current_user.get("sub")
    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found")

    user_role = get_user_vault_role(db, user_id, vault_id, workspace_id)
    if user_role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No membership on this vault",
        )
    if user_role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only vault owners can archive",
        )

    vault = archive_vault(db, vault)
    create_event(
        db,
        vault_id=vault.id,
        workspace_id=vault.workspace_id,
        event_type="vault_archived",
        actor_id=user_id,
        payload={"name": vault.name},
    )
    return _vault_to_response(vault)
