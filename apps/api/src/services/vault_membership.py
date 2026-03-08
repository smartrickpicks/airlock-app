"""Vault membership — lookup a user's role on a vault with inheritance."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.vault import Vault
from src.models.vault_member import VaultMember

_MAX_HIERARCHY_DEPTH = 4  # L1 entity → L2 division → L3 counterparty → L4 item


def get_user_vault_role(
    db: Session,
    user_id: str,
    vault_id: str,
    workspace_id: str,
    _visited: frozenset[str] | None = None,
) -> str | None:
    """Get the effective role for a user on a vault.

    Checks direct membership first, then walks up the vault hierarchy
    looking for inherited roles. Returns the highest role found, or None.

    Includes cycle guard and depth cap to prevent infinite recursion
    from corrupted hierarchy data.
    """
    if _visited is None:
        _visited = frozenset()
    if vault_id in _visited or len(_visited) >= _MAX_HIERARCHY_DEPTH:
        return None
    _visited = _visited | {vault_id}

    # Direct membership
    member = db.execute(
        select(VaultMember).where(
            VaultMember.vault_id == vault_id,
            VaultMember.user_id == user_id,
        )
    ).scalar_one_or_none()

    if member:
        return member.role

    # Walk up parent chain for inherited roles
    vault = db.execute(
        select(Vault).where(
            Vault.id == vault_id,
            Vault.workspace_id == workspace_id,
        )
    ).scalar_one_or_none()

    if vault and vault.parent_vault_id:
        return get_user_vault_role(db, user_id, vault.parent_vault_id, workspace_id, _visited)

    return None
