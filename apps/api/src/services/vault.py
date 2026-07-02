"""Vault service — business logic for vault CRUD and hierarchy."""

import asyncio
import logging
from datetime import UTC

from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.vault import Vault
from src.models.vault_member import VaultMember
from src.realtime.emitter import emit_domain_event
from src.services.search import index_vault
from src.services.workspace_service import slugify

logger = logging.getLogger(__name__)


def _fire_event(
    topic: str, event_type: str, payload: dict, workspace_id: str, actor_id: str | None = None
) -> None:
    """Schedule an emit_domain_event call on the running event loop (fire-and-forget)."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            emit_domain_event(
                topic=topic,
                event_type=event_type,
                payload=payload,
                workspace_id=workspace_id,
                actor_id=actor_id,
            )
        )
    except Exception:
        logger.warning("Failed to emit %s event for topic %s", event_type, topic)


VALID_CHAMBERS = ("discover", "build", "review", "ship")
CHAMBER_ORDER = {c: i for i, c in enumerate(VALID_CHAMBERS)}

VALID_VAULT_TYPES = ("entity", "division", "counterparty", "contract", "task", "document")
VALID_MODULE_TYPES = ("contracts", "crm", "tasks", "calendar", "documents")
VALID_MEMBER_ROLES = ("owner", "gatekeeper", "builder", "viewer")

GATES_BY_CHAMBER: dict[str, list[str]] = {
    "discover": ["gate_ingest", "gate_triage"],
    "build": ["gate_extract", "gate_preflight", "gate_enrich"],
    "review": ["gate_builder", "gate_gatekeeper", "gate_owner"],
    "ship": ["gate_export", "gate_sync"],
}


def _vault_to_search_dict(vault: Vault) -> dict:
    """Convert a Vault ORM instance to a dict suitable for search indexing."""
    return {
        "id": vault.id,
        "name": vault.name,
        "metadata": vault.metadata_ or {},
        "module_type": vault.module_type,
        "chamber": vault.chamber,
        "vault_level": vault.vault_level,
        "workspace_id": vault.workspace_id,
        "health_score": vault.health_score,
        "archived_at": vault.archived_at,
        "created_at": str(vault.created_at) if vault.created_at else "",
        "updated_at": str(vault.updated_at) if vault.updated_at else "",
    }


def create_vault(
    db: Session,
    *,
    workspace_id: str,
    name: str,
    vault_type: str,
    vault_level: int = 4,
    parent_vault_id: str | None = None,
    module_type: str | None = None,
    metadata: dict | None = None,
    creator_id: str | None = None,
) -> Vault:
    """Create a new vault and optionally add the creator as owner."""
    slug = slugify(name)

    # Ensure slug uniqueness within workspace
    base_slug = slug
    counter = 1
    while True:
        exists = db.execute(
            select(Vault).where(Vault.workspace_id == workspace_id, Vault.slug == slug)
        ).scalar_one_or_none()
        if exists is None:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Only item vaults (level 4) get chamber state
    chamber = "discover" if vault_level == 4 else None
    gate = "gate_ingest" if vault_level == 4 else None

    vault = Vault(
        id=str(ULID()),
        workspace_id=workspace_id,
        parent_vault_id=parent_vault_id,
        vault_level=vault_level,
        name=name,
        slug=slug,
        vault_type=vault_type,
        module_type=module_type,
        chamber=chamber,
        gate=gate,
        metadata_=metadata or {},
    )
    db.add(vault)

    if creator_id:
        member = VaultMember(vault_id=vault.id, user_id=creator_id, role="owner")
        db.add(member)

    db.commit()
    db.refresh(vault)

    try:
        index_vault(_vault_to_search_dict(vault))
    except Exception:
        logger.warning("Failed to index vault %s in search", vault.id)

    _fire_event(
        topic=f"workspace:{workspace_id}",
        event_type="vault.created",
        payload={
            "vault_id": vault.id,
            "name": vault.name,
            "vault_type": vault_type,
            "module_type": module_type,
            "chamber": vault.chamber,
        },
        workspace_id=workspace_id,
        actor_id=creator_id,
    )

    return vault


def get_vault(db: Session, vault_id: str, workspace_id: str) -> Vault | None:
    """Get a single vault by ID within a workspace (excludes archived)."""
    stmt = select(Vault).where(
        Vault.id == vault_id,
        Vault.workspace_id == workspace_id,
        Vault.archived_at.is_(None),
    )
    return db.execute(stmt).scalar_one_or_none()


def list_vaults(
    db: Session,
    workspace_id: str,
    *,
    module_type: str | None = None,
    vault_level: int | None = None,
    chamber: str | None = None,
    parent_vault_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Vault]:
    """List vaults with optional filters. Excludes archived."""
    stmt = select(Vault).where(
        Vault.workspace_id == workspace_id,
        Vault.archived_at.is_(None),
    )
    if module_type:
        stmt = stmt.where(Vault.module_type == module_type)
    if vault_level is not None:
        stmt = stmt.where(Vault.vault_level == vault_level)
    if chamber:
        stmt = stmt.where(Vault.chamber == chamber)
    if parent_vault_id is not None:
        stmt = stmt.where(Vault.parent_vault_id == parent_vault_id)

    stmt = stmt.order_by(Vault.updated_at.desc()).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


def get_vault_children(db: Session, vault_id: str, workspace_id: str) -> list[Vault]:
    """Get direct children of a vault."""
    stmt = (
        select(Vault)
        .where(
            Vault.parent_vault_id == vault_id,
            Vault.workspace_id == workspace_id,
            Vault.archived_at.is_(None),
        )
        .order_by(Vault.vault_level, Vault.name)
    )
    return list(db.execute(stmt).scalars().all())


def update_vault(
    db: Session,
    vault: Vault,
    *,
    name: str | None = None,
    metadata: dict | None = None,
    parent_vault_id: str | None = ...,  # sentinel: ... means "not provided"
) -> Vault:
    """Update vault fields. Pass parent_vault_id=None to unlink, omit to leave unchanged."""
    if name is not None:
        vault.name = name
    if metadata is not None:
        vault.metadata_ = metadata
    if parent_vault_id is not ...:
        vault.parent_vault_id = parent_vault_id

    db.commit()
    db.refresh(vault)

    try:
        index_vault(_vault_to_search_dict(vault))
    except Exception:
        logger.warning("Failed to index vault %s in search after update", vault.id)

    return vault


def advance_chamber(db: Session, vault: Vault) -> Vault:
    """Advance an item vault to the next chamber. Returns updated vault.

    Raises ValueError if vault is not level 4 or already at final chamber.
    """
    if vault.vault_level != 4:
        raise ValueError("Only item vaults (level 4) have chambers")
    if vault.chamber is None or vault.chamber not in CHAMBER_ORDER:
        raise ValueError(f"Invalid chamber: {vault.chamber}")

    current_idx = CHAMBER_ORDER[vault.chamber]
    if current_idx >= len(VALID_CHAMBERS) - 1:
        raise ValueError("Vault is already in the final chamber (ship)")

    next_chamber = VALID_CHAMBERS[current_idx + 1]
    vault.chamber = next_chamber
    vault.gate = GATES_BY_CHAMBER[next_chamber][0]  # First gate of next chamber

    db.commit()
    db.refresh(vault)

    try:
        index_vault(_vault_to_search_dict(vault))
    except Exception:
        logger.warning("Failed to index vault %s in search after chamber advance", vault.id)

    _fire_event(
        topic=f"vault:{vault.id}",
        event_type="vault.chamber_advanced",
        payload={
            "vault_id": vault.id,
            "from_chamber": VALID_CHAMBERS[current_idx],
            "to_chamber": next_chamber,
            "gate": vault.gate,
        },
        workspace_id=vault.workspace_id,
    )

    return vault


def archive_vault(db: Session, vault: Vault) -> Vault:
    """Soft-delete a vault by setting archived_at."""
    from datetime import datetime

    vault.archived_at = datetime.now(UTC)
    db.commit()
    db.refresh(vault)

    try:
        index_vault(_vault_to_search_dict(vault))
    except Exception:
        logger.warning("Failed to index vault %s in search after archive", vault.id)

    _fire_event(
        topic=f"vault:{vault.id}",
        event_type="vault.archived",
        payload={"vault_id": vault.id},
        workspace_id=vault.workspace_id,
    )

    return vault
