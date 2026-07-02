"""Entity vault loader — fetches self/counterparty vaults for entity resolution.

Self vaults: L1 (entity) + L2 (division) — represent the workspace owner.
Counterparty vaults: L3 (counterparty) — represent business counterparties.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.vault import Vault


def vault_to_match_dict(vault: Any) -> dict[str, Any]:
    """Convert a Vault ORM instance to a dict for the resolver."""
    metadata = getattr(vault, "metadata_", {}) or {}
    return {
        "id": vault.id,
        "name": vault.name,
        "vault_type": vault.vault_type,
        "vault_level": vault.vault_level,
        "aliases": metadata.get("aliases", []),
    }


def load_self_vaults(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    """Load L1 (entity) and L2 (division) vaults for self-recognition."""
    stmt = (
        select(Vault)
        .where(
            Vault.workspace_id == workspace_id,
            Vault.vault_level.in_([1, 2]),
            Vault.vault_type.in_(["entity", "division"]),
            Vault.archived_at.is_(None),
        )
        .order_by(Vault.vault_level, Vault.name)
    )
    vaults = db.execute(stmt).scalars().all()
    return [vault_to_match_dict(v) for v in vaults]


def load_counterparty_vaults(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    """Load L3 (counterparty) vaults for counterparty resolution."""
    stmt = (
        select(Vault)
        .where(
            Vault.workspace_id == workspace_id,
            Vault.vault_level == 3,
            Vault.vault_type == "counterparty",
            Vault.archived_at.is_(None),
        )
        .order_by(Vault.name)
    )
    vaults = db.execute(stmt).scalars().all()
    return [vault_to_match_dict(v) for v in vaults]
