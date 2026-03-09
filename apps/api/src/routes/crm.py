"""CRM module routes — thin shim over vault queries."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.vault import Vault

router = APIRouter(prefix="/api/v1/crm", tags=["crm"])


def _chamber_to_pipeline_stage(chamber: str | None) -> str:
    """Map chamber to CRM pipeline stage."""
    mapping = {
        "discover": "prospecting",
        "build": "proposal",
        "review": "negotiation",
        "ship": "close",
    }
    return mapping.get(chamber or "discover", "prospecting")


@router.get("")
async def get_crm_data(
    db: Session = Depends(get_db),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Return CRM data shaped for the frontend store.

    Queries vaults with module_type='crm' and reshapes into
    accounts, deals, and leads arrays.
    """
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=403, detail="No workspace associated")

    stmt = (
        select(Vault)
        .where(Vault.workspace_id == workspace_id)
        .where(Vault.module_type == "crm")
        .where(Vault.archived_at.is_(None))
    )
    vaults = db.execute(stmt).scalars().all()

    accounts: list[dict] = []
    deals: list[dict] = []
    leads: list[dict] = []

    for v in vaults:
        meta = v.metadata_ or {}
        base = {
            "id": v.id,
            "name": v.name,
            "currentChamber": v.chamber,
        }

        if v.vault_type == "account":
            accounts.append(
                {
                    **base,
                    "segment": meta.get("size", "mid_market").lower().replace(" ", "_"),
                    "healthScore": v.health_score or 0,
                    "healthTrend": 0,
                    "dealCount": 0,
                    "totalValue": 0,
                    "contacts": [],
                    "lastContact": v.updated_at.isoformat() if v.updated_at else "",
                    "status": meta.get("status", "active"),
                }
            )
        elif v.vault_type == "contact":
            accounts.append(
                {
                    **base,
                    "segment": "contact",
                    "healthScore": 0,
                    "healthTrend": 0,
                    "dealCount": 0,
                    "totalValue": 0,
                    "contacts": [],
                    "lastContact": v.updated_at.isoformat() if v.updated_at else "",
                    "parentVaultId": v.parent_vault_id,
                    "title": meta.get("title", ""),
                    "email": meta.get("email", ""),
                }
            )
        elif v.vault_type == "opportunity":
            deals.append(
                {
                    **base,
                    "title": v.name,
                    "accountName": meta.get("prospect", ""),
                    "vaultSlug": v.slug or "",
                    "value": 0,
                    "stage": _chamber_to_pipeline_stage(v.chamber),
                    "assignedRep": "",
                    "taskCount": 0,
                    "overdueTaskCount": 0,
                    "daysInStage": 0,
                    "progressPercent": 0,
                    "nextTask": None,
                }
            )
        else:
            leads.append(
                {
                    **base,
                    "matchStatus": "unknown",
                    "source": "manual_rep_entry",
                    "score": None,
                    "stage": "new",
                    "assignedRep": None,
                    "ageDays": 0,
                }
            )

    return {"accounts": accounts, "deals": deals, "leads": leads}
