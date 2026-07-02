"""CRM module routes — vault queries with computed metrics."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.vault import Vault

router = APIRouter(prefix="/api/v1/crm", tags=["crm"])

# Chamber → progress percent (rough approximation)
_CHAMBER_PROGRESS = {"discover": 15, "build": 40, "review": 70, "ship": 95}


def _days_since(dt: datetime | None) -> int:
    if not dt:
        return 0
    now = datetime.now(UTC)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return max(0, (now - dt).days)


def _compute_health(vault, deal_count: int, contact_count: int) -> int:
    """Heuristic health score (0-100) from activity, deals, contacts."""
    if vault.health_score and vault.health_score > 0:
        return int(vault.health_score)
    score = 50
    days_idle = _days_since(vault.updated_at)
    if days_idle < 3:
        score += 20
    elif days_idle < 7:
        score += 10
    elif days_idle > 30:
        score -= 20
    score += min(deal_count * 10, 20)
    score += min(contact_count * 5, 15)
    status = (vault.metadata_ or {}).get("status", "active")
    if status == "churned":
        score -= 30
    elif status == "at_risk":
        score -= 15
    return max(0, min(100, score))


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

    # Index vaults by id and parent for relationship lookups
    by_id: dict[str, Vault] = {v.id: v for v in vaults}
    children_of: dict[str, list[Vault]] = {}
    for v in vaults:
        if v.parent_vault_id:
            children_of.setdefault(v.parent_vault_id, []).append(v)

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
            children = children_of.get(v.id, [])
            child_contacts = [c for c in children if c.vault_type == "contact"]
            child_deals = [c for c in children if c.vault_type == "opportunity"]
            total_value = sum((c.metadata_ or {}).get("value", 0) for c in child_deals)
            contact_names = [
                {
                    "name": c.name,
                    "title": (c.metadata_ or {}).get("title", ""),
                    "email": (c.metadata_ or {}).get("email", ""),
                }
                for c in child_contacts[:5]
            ]
            health = _compute_health(v, len(child_deals), len(child_contacts))

            accounts.append(
                {
                    **base,
                    "segment": meta.get("size", "mid_market").lower().replace(" ", "_"),
                    "healthScore": health,
                    "healthTrend": meta.get("health_trend", 0),
                    "dealCount": len(child_deals),
                    "totalValue": total_value,
                    "contacts": contact_names,
                    "lastContact": v.updated_at.isoformat() if v.updated_at else "",
                    "status": meta.get("status", "active"),
                }
            )
        elif v.vault_type == "contact":
            # Contacts parented to an account are rolled up above; orphans show standalone
            if not v.parent_vault_id:
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
                        "title": meta.get("title", ""),
                        "email": meta.get("email", ""),
                    }
                )
        elif v.vault_type == "opportunity":
            deal_value = meta.get("value", meta.get("deal_value", 0))
            account_name = meta.get("prospect", meta.get("account_name", ""))
            if v.parent_vault_id and v.parent_vault_id in by_id:
                account_name = account_name or by_id[v.parent_vault_id].name

            deals.append(
                {
                    **base,
                    "title": v.name,
                    "accountName": account_name,
                    "vaultSlug": v.slug or "",
                    "value": deal_value,
                    "stage": _chamber_to_pipeline_stage(v.chamber),
                    "assignedRep": meta.get("assigned_rep", meta.get("owner", "")),
                    "taskCount": meta.get("task_count", 0),
                    "overdueTaskCount": meta.get("overdue_task_count", 0),
                    "daysInStage": _days_since(v.updated_at),
                    "progressPercent": _CHAMBER_PROGRESS.get(v.chamber or "discover", 15),
                    "nextTask": meta.get("next_task"),
                }
            )
        else:
            leads.append(
                {
                    **base,
                    "matchStatus": meta.get("match_status", "unknown"),
                    "source": meta.get("source", "manual_rep_entry"),
                    "score": meta.get("lead_score"),
                    "stage": meta.get("lead_stage", "new"),
                    "assignedRep": meta.get("assigned_rep"),
                    "ageDays": _days_since(v.created_at),
                }
            )

    return {"accounts": accounts, "deals": deals, "leads": leads}
