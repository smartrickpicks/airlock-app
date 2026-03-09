#!/usr/bin/env python3
"""Liftoff seed — Zachary's Airlock HQ workspace with real-life data."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "apps", "api"))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from ulid import ULID

from src.db import Base
from src.models.workspace import Workspace
from src.models.user import User
from src.models.vault import Vault
from src.models.event import Event

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://airlock:airlock@localhost:5433/airlock"
)
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


def seed():
    db = Session()

    # ── Check if already seeded ──────────────────────────────────────
    existing = db.execute(
        select(Workspace).where(Workspace.slug == "airlock-hq")
    ).scalar_one_or_none()
    if existing:
        print(f"Workspace 'Airlock HQ' already exists ({existing.id}). Skipping seed.")
        db.close()
        return

    # ── Workspace ────────────────────────────────────────────────────
    ws_id = str(ULID())
    ws = Workspace(
        id=ws_id,
        name="Airlock HQ",
        slug="airlock-hq",
        metadata_={"persona": "maverick", "plan": "founder", "industry": "music"},
    )
    db.add(ws)
    db.flush()  # workspace must exist before users/vaults

    # ── Users ────────────────────────────────────────────────────────
    zach_id = str(ULID())
    zach = User(
        id=zach_id,
        workspace_id=ws_id,
        email="zachary@airlock.dev",
        display_name="Zachary Holwerda",
        org_role="executive",
        metadata_={"persona": "maverick"},
    )
    db.add(zach)
    db.flush()  # user must exist before events reference actor_id

    # ── Contract Vaults ──────────────────────────────────────────────

    # Vault 1: Win Back CMG (the pitch) — enters at Discover
    cmg_vault_id = str(ULID())
    cmg_vault = Vault(
        id=cmg_vault_id,
        workspace_id=ws_id,
        name="Win Back CMG — M&A Contract Ingestion",
        slug="win-back-cmg",
        vault_type="opportunity",
        vault_level=4,
        module_type="contracts",
        chamber="discover",
        gate="gate_red",
        health_score=65.0,
        metadata_={
            "prospect": "Create Music Group",
            "contact": "Kevin Liles",
            "deal_size": "Enterprise",
            "pitch": "M&A contract ingestion + drift detection",
            "backstory": "Previous POC — ported OrcestrateOS. Let go before completion.",
            "entry_point": "discover",
        },
    )
    db.add(cmg_vault)

    # Vault 2: Sample Distribution Agreement — enters at Review (ingested contract)
    dist_vault_id = str(ULID())
    dist_vault = Vault(
        id=dist_vault_id,
        workspace_id=ws_id,
        name="Distribution Agreement — Acme Records × Summit Publishing",
        slug="dist-acme-summit",
        vault_type="contract",
        vault_level=4,
        module_type="contracts",
        chamber="review",
        gate="gate_purple",
        health_score=82.0,
        metadata_={
            "contract_type": "Distribution",
            "territory": "Worldwide",
            "effective_date": "2026-01-15",
            "parties": ["Acme Records", "Summit Publishing"],
            "entry_point": "review",
        },
    )
    db.add(dist_vault)

    # Vault 3: Master License Template — in Ship (production template)
    template_vault_id = str(ULID())
    template_vault = Vault(
        id=template_vault_id,
        workspace_id=ws_id,
        name="Master License Template v2.1",
        slug="master-license-template",
        vault_type="template",
        vault_level=4,
        module_type="contracts",
        chamber="ship",
        gate="gate_green",
        health_score=95.0,
        metadata_={
            "contract_type": "Master License",
            "verified": True,
            "drift_detection": True,
            "cross_entity_normalization": True,
            "entry_point": "ship",
        },
    )
    db.add(template_vault)

    # ── CRM Vaults (contacts as vault-backed entities) ───────────────

    cmg_contact_id = str(ULID())
    cmg_contact = Vault(
        id=cmg_contact_id,
        workspace_id=ws_id,
        name="Create Music Group",
        slug="create-music-group",
        vault_type="account",
        vault_level=4,
        module_type="crm",
        chamber="discover",
        gate="gate_red",
        metadata_={
            "company": "Create Music Group",
            "ceo": "Kevin Liles",
            "industry": "Music",
            "size": "Enterprise",
            "status": "prospect",
            "relationship": "Former client — POC incomplete",
        },
    )
    db.add(cmg_contact)

    kevin_contact_id = str(ULID())
    kevin_contact = Vault(
        id=kevin_contact_id,
        workspace_id=ws_id,
        parent_vault_id=cmg_contact_id,
        name="Kevin Liles",
        slug="kevin-liles",
        vault_type="contact",
        vault_level=4,
        module_type="crm",
        chamber="discover",
        metadata_={
            "title": "CEO",
            "company": "Create Music Group",
            "email": "",
            "relationship": "Decision maker",
        },
    )
    db.add(kevin_contact)

    # ── Triage Items (tasks as vault-backed entities) ────────────────

    triage_items = [
        {
            "name": "Prepare CMG pitch deck",
            "slug": "prepare-cmg-pitch-deck",
            "metadata": {"status": "todo", "priority": "high", "assignee": zach_id},
        },
        {
            "name": "Configure Otto for contract analysis",
            "slug": "configure-otto-contract-analysis",
            "metadata": {"status": "in_progress", "priority": "high", "assignee": zach_id},
        },
        {
            "name": "Upload sample M&A contracts",
            "slug": "upload-sample-contracts",
            "metadata": {"status": "todo", "priority": "medium", "assignee": zach_id},
        },
        {
            "name": "Set up drift detection rules for Ship chamber",
            "slug": "setup-drift-detection",
            "metadata": {"status": "todo", "priority": "medium", "assignee": zach_id},
        },
        {
            "name": "Record Liftoff demo for investors",
            "slug": "record-liftoff-demo",
            "metadata": {"status": "todo", "priority": "low", "assignee": zach_id},
        },
    ]

    for item in triage_items:
        triage_vault = Vault(
            id=str(ULID()),
            workspace_id=ws_id,
            name=item["name"],
            slug=item["slug"],
            vault_type="task",
            vault_level=4,
            module_type="triage",
            chamber="discover",
            metadata_=item["metadata"],
        )
        db.add(triage_vault)

    # Flush so vaults exist before inserting events (FK constraint)
    db.flush()

    # ── Events ───────────────────────────────────────────────────────

    events = [
        {
            "vault_id": cmg_vault_id,
            "event_type": "vault_created",
            "actor_id": zach_id,
            "payload": {"name": "Win Back CMG", "chamber": "discover"},
        },
        {
            "vault_id": dist_vault_id,
            "event_type": "vault_created",
            "actor_id": zach_id,
            "payload": {"name": "Distribution Agreement", "chamber": "review", "entry_point": "review"},
        },
        {
            "vault_id": template_vault_id,
            "event_type": "vault_created",
            "actor_id": zach_id,
            "payload": {"name": "Master License Template", "chamber": "ship", "verified": True},
        },
    ]

    for evt in events:
        event = Event(
            id=str(ULID()),
            workspace_id=ws_id,
            vault_id=evt["vault_id"],
            event_type=evt["event_type"],
            actor_id=evt["actor_id"],
            payload=evt["payload"],
        )
        db.add(event)

    # ── Commit ───────────────────────────────────────────────────────
    db.commit()

    print("=== Liftoff Seed Complete ===")
    print(f"Workspace: {ws.name} ({ws.id})")
    print(f"User: {zach.display_name} ({zach.id})")
    print(f"Contract vaults: 3 (CMG pitch, distribution agreement, master template)")
    print(f"CRM vaults: 2 (CMG account + Kevin Liles contact)")
    print(f"Triage items: {len(triage_items)}")
    print(f"Events: {len(events)}")
    db.close()


if __name__ == "__main__":
    seed()
