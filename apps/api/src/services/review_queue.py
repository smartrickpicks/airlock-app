"""Review queue service — aggregates vaults in review chamber for gatekeeper dashboard."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.event import Event
from src.models.vault import Vault
from src.models.vault_member import VaultMember


def _health_color(score: float | None) -> str:
    if score is None:
        return "review"
    if score >= 80:
        return "pass"
    if score >= 50:
        return "review"
    return "fail"


def _gate_label(gate: str | None) -> str:
    labels = {
        "gate_builder": "Builder Review",
        "gate_gatekeeper": "Gatekeeper Review",
        "gate_owner": "Owner Review",
    }
    return labels.get(gate or "", gate or "Pending Review")


def build_review_queue(db: Session, workspace_id: str) -> dict:
    """Build the full review queue response for a workspace.

    Returns the shape the frontend expects:
      { parentVaults: [...], signals: [...], feedItems: [...] }
    """
    # 1. Get all vaults in the review chamber
    review_vaults = list(
        db.execute(
            select(Vault).where(
                Vault.workspace_id == workspace_id,
                Vault.chamber == "review",
                Vault.vault_level == 4,
                Vault.archived_at.is_(None),
            )
        )
        .scalars()
        .all()
    )

    if not review_vaults:
        return {"parentVaults": [], "signals": [], "feedItems": []}

    # 2. Group vaults by parent_vault_id (or self if no parent)
    parent_groups: dict[str | None, list[Vault]] = {}
    for v in review_vaults:
        key = v.parent_vault_id
        parent_groups.setdefault(key, []).append(v)

    # 3. Fetch parent vault names
    parent_ids = [pid for pid in parent_groups if pid is not None]
    parent_name_map: dict[str, str] = {}
    parent_type_map: dict[str, str] = {}
    if parent_ids:
        parents = list(db.execute(select(Vault).where(Vault.id.in_(parent_ids))).scalars().all())
        for p in parents:
            parent_name_map[p.id] = p.name
            parent_type_map[p.id] = p.vault_type

    # 4. Fetch vault members for builder names
    vault_ids = [v.id for v in review_vaults]
    members = list(
        db.execute(
            select(VaultMember).where(
                VaultMember.vault_id.in_(vault_ids),
                VaultMember.role == "builder",
            )
        )
        .scalars()
        .all()
    )
    # Map vault_id -> list of builder user_ids
    vault_builders: dict[str, list[str]] = {}
    for m in members:
        vault_builders.setdefault(m.vault_id, []).append(m.user_id)

    # 5. Build parent vault cards
    parent_vaults = []
    for parent_id, children_vaults in parent_groups.items():
        pname = parent_name_map.get(parent_id or "", parent_id or "Ungrouped")
        ptype = parent_type_map.get(parent_id or "", "contract")

        scores = [v.health_score for v in children_vaults if v.health_score is not None]
        avg_health = round(sum(scores) / len(scores)) if scores else 0
        ready = sum(1 for v in children_vaults if (v.health_score or 0) >= 50)

        all_builders: set[str] = set()
        for v in children_vaults:
            for b in vault_builders.get(v.id, []):
                all_builders.add(b)

        children = []
        for v in children_vaults:
            builders = vault_builders.get(v.id, [])
            children.append(
                {
                    "id": v.id,
                    "counterparty": v.name,
                    "builder": builders[0] if builders else "Unassigned",
                    "healthScore": round(v.health_score or 0),
                    "gateStatus": _health_color(v.health_score),
                    "gateLabel": _gate_label(v.gate),
                    "itemCount": 1,
                    "category": ptype.title(),
                }
            )

        parent_vaults.append(
            {
                "id": parent_id or f"ungrouped_{children_vaults[0].id}",
                "name": pname,
                "typeBadge": ptype.title(),
                "vaultCount": len(children_vaults),
                "healthScore": avg_health,
                "assignedBuilders": list(all_builders),
                "buildReadyPercent": round(ready / len(children_vaults) * 100)
                if children_vaults
                else 0,
                "buildReadyCount": ready,
                "buildReadyTotal": len(children_vaults),
                "patches": 0,
                "rfis": 0,
                "corrections": 0,
                "anomalies": 0,
                "children": children,
            }
        )

    # 6. Build signals from recent events on review vaults
    signals = _build_signals(db, vault_ids)

    # 7. Build activity feed from recent events
    feed_items = _build_feed(db, vault_ids, workspace_id)

    return {
        "parentVaults": parent_vaults,
        "signals": signals,
        "feedItems": feed_items,
    }


def _build_signals(db: Session, vault_ids: list[str]) -> list[dict]:
    """Build handoff signal summaries from events on review vaults."""
    if not vault_ids:
        return []

    # Count events by type for signal aggregation
    signal_types = {
        "patch.submitted": "correction",
        "extraction_complete": "anomaly",
        "preflight_complete": "rfi",
    }

    events = list(
        db.execute(
            select(Event)
            .where(
                Event.vault_id.in_(vault_ids),
                Event.event_type.in_(list(signal_types.keys())),
            )
            .order_by(Event.created_at.desc())
            .limit(50)
        )
        .scalars()
        .all()
    )

    # Group by signal type
    signal_groups: dict[str, list[Event]] = {"rfi": [], "correction": [], "anomaly": []}
    for evt in events:
        stype = signal_types.get(evt.event_type, "correction")
        signal_groups[stype].append(evt)

    signals = []
    labels = {"rfi": "RFIs", "correction": "Corrections", "anomaly": "Anomalies"}

    for stype, sevents in signal_groups.items():
        if not sevents:
            continue
        items = []
        for evt in sevents[:5]:
            items.append(
                {
                    "id": evt.id,
                    "vaultName": evt.vault_id,
                    "entityTag": "",
                    "analyst": evt.actor_id or "System",
                    "description": _event_description(evt),
                    "timestamp": evt.created_at.isoformat() if evt.created_at else "",
                }
            )
        signals.append(
            {
                "type": stype,
                "label": labels[stype],
                "count": len(sevents),
                "breakdown": f"{len(sevents)} total",
                "items": items,
            }
        )

    return signals


def _build_feed(db: Session, vault_ids: list[str], workspace_id: str) -> list[dict]:
    """Build activity feed from recent events on review vaults."""
    if not vault_ids:
        return []

    events = list(
        db.execute(
            select(Event)
            .where(Event.vault_id.in_(vault_ids))
            .order_by(Event.created_at.desc())
            .limit(20)
        )
        .scalars()
        .all()
    )

    # Map event_type to FeedEventType
    type_map = {
        "vault_created": "activity.summary",
        "document_uploaded": "activity.summary",
        "document_parsed": "activity.summary",
        "preflight_complete": "rfi.created",
        "extraction_complete": "anomaly.detected",
        "chamber_advanced": "activity.summary",
        "gate_cleared": "activity.summary",
    }

    feed = []
    for evt in events:
        feed_type = type_map.get(evt.event_type, "activity.summary")
        payload = evt.payload or {}
        feed.append(
            {
                "id": evt.id,
                "eventType": feed_type,
                "title": _event_title(evt),
                "vaultName": payload.get("name", evt.vault_id),
                "entityName": "",
                "builderName": evt.actor_id or "System",
                "detail": _event_description(evt),
                "badge": _event_badge(evt),
                "timestamp": evt.created_at.isoformat() if evt.created_at else "",
            }
        )

    return feed


def _event_title(event: Event) -> str:
    titles = {
        "vault_created": "Vault created",
        "document_uploaded": "Document uploaded",
        "document_parsed": "Document parsed",
        "preflight_complete": "Preflight complete",
        "extraction_complete": "Extraction complete",
        "chamber_advanced": "Chamber advanced",
        "gate_cleared": "Gate cleared",
        "vault_archived": "Vault archived",
        "member_added": "Member added",
    }
    return titles.get(event.event_type, event.event_type.replace("_", " ").title())


def _event_description(event: Event) -> str:
    payload = event.payload or {}
    if event.event_type == "chamber_advanced":
        return f"Advanced to {payload.get('chamber', 'next')} chamber"
    if event.event_type == "preflight_complete":
        return f"Gate color: {payload.get('gate_color', 'unknown')}"
    if event.event_type == "extraction_complete":
        return f"{payload.get('field_count', 0)} fields extracted"
    if event.event_type == "document_uploaded":
        return f"Document {payload.get('document_id', '')}"
    return event.event_type.replace("_", " ")


def _event_badge(event: Event) -> str | None:
    badges = {
        "preflight_complete": "PREFLIGHT",
        "extraction_complete": "EXTRACTION",
        "chamber_advanced": "ADVANCE",
    }
    return badges.get(event.event_type)
