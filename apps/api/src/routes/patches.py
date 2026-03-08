"""Patch routes — CRUD and state transitions for field corrections."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.schemas.patch import (
    CreatePatchRequest,
    PatchListResponse,
    PatchResponse,
    TransitionPatchRequest,
)
from src.services.event import create_event
from src.services.patch import (
    create_patch,
    get_patch,
    list_patches_for_vault,
    transition_patch,
)

router = APIRouter(prefix="/api/v1/vaults/{vault_id}/patches", tags=["patches"])


def _patch_to_response(patch) -> PatchResponse:
    return PatchResponse(
        id=patch.id,
        vault_id=patch.vault_id,
        workspace_id=patch.workspace_id,
        field_key=patch.field_key,
        old_value=patch.old_value,
        new_value=patch.new_value,
        status=patch.status,
        submitted_by=patch.submitted_by,
        reviewed_by=patch.reviewed_by,
        version=patch.version,
        evidence=patch.evidence,
        history=patch.history,
        metadata=patch.metadata_,
        created_at=patch.created_at,
        updated_at=patch.updated_at,
    )


@router.get("")
def list_patches_route(
    vault_id: str,
    limit: int = Query(default=50, ge=1, le=200),  # noqa: B008
    offset: int = Query(default=0, ge=0),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> PatchListResponse:
    """List patches for a vault."""
    workspace_id = current_user.get("workspace_id", "")
    patches = list_patches_for_vault(db, vault_id, workspace_id, limit=limit, offset=offset)
    return PatchListResponse(
        patches=[_patch_to_response(p) for p in patches],
        total=len(patches),
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_patch_route(
    vault_id: str,
    body: CreatePatchRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> PatchResponse:
    """Create a new patch draft."""
    workspace_id = current_user.get("workspace_id", "")
    actor_id = current_user.get("sub")
    patch = create_patch(
        db,
        vault_id=vault_id,
        workspace_id=workspace_id,
        field_key=body.field_key,
        old_value=body.old_value,
        new_value=body.new_value,
        submitted_by=actor_id,
        evidence=body.evidence,
        metadata=body.metadata,
    )
    create_event(
        db,
        vault_id=vault_id,
        workspace_id=workspace_id,
        event_type="patch_created",
        actor_id=actor_id,
        payload={"patch_id": patch.id, "field_key": body.field_key},
    )
    return _patch_to_response(patch)


@router.get("/{patch_id}")
def get_patch_route(
    vault_id: str,
    patch_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> PatchResponse:
    """Get a single patch by ID."""
    workspace_id = current_user.get("workspace_id", "")
    patch = get_patch(db, patch_id, workspace_id)
    if patch is None or patch.vault_id != vault_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patch not found")
    return _patch_to_response(patch)


@router.post("/{patch_id}/transition")
def transition_patch_route(
    vault_id: str,
    patch_id: str,
    body: TransitionPatchRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> PatchResponse:
    """Transition a patch through the approval state machine."""
    workspace_id = current_user.get("workspace_id", "")
    actor_id = current_user.get("sub", "")
    patch = get_patch(db, patch_id, workspace_id)
    if patch is None or patch.vault_id != vault_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patch not found")
    try:
        patch = transition_patch(
            db,
            patch,
            action=body.action,
            actor_id=actor_id,
            expected_version=body.version,
            note=body.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    create_event(
        db,
        vault_id=vault_id,
        workspace_id=workspace_id,
        event_type=f"patch_{body.action}",
        actor_id=actor_id,
        payload={
            "patch_id": patch.id,
            "field_key": patch.field_key,
            "from": patch.history[-1]["from"] if patch.history else "",
            "to": patch.status,
        },
    )
    return _patch_to_response(patch)
