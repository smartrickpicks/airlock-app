#!/usr/bin/env python3
"""
Deterministic seed data generator for the Airlock project.

Generates mock data for development and testing:
- 1 workspace
- 3 users (builder, gatekeeper, owner)
- 10 vaults across 4 chambers
- 20 events spread across the vaults

Usage:
    python scripts/seeds/seed.py
    python scripts/seeds/seed.py | jq .
"""

import json
import random
from datetime import datetime, timedelta, timezone

from faker import Faker
from ulid import ULID

# Lock seeds for deterministic output
Faker.seed(42)
random.seed(42)
fake = Faker()


def generate_ulid() -> str:
    """Generate a deterministic ULID string."""
    return str(ULID())


def generate_timestamp(base: datetime, offset_days: int = 0) -> datetime:
    """Generate a UTC timestamp offset from a base date."""
    return base + timedelta(
        days=offset_days,
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
        seconds=random.randint(0, 59),
    )


def main() -> None:
    base_date = datetime(2026, 1, 1, tzinfo=timezone.utc)

    # --- Workspace ---
    workspace_id = generate_ulid()
    workspace = {
        "id": workspace_id,
        "name": "Acme Records",
        "slug": "acme-records",
        "created_at": generate_timestamp(base_date),
        "updated_at": generate_timestamp(base_date, offset_days=5),
        "deleted_at": None,
        "metadata": {},
    }

    # --- Users ---
    user_definitions = [
        {"name": "Ana Chen", "role": "builder"},
        {"name": "David Park", "role": "gatekeeper"},
        {"name": "Sarah Miller", "role": "owner"},
    ]

    users = []
    for defn in user_definitions:
        user_id = generate_ulid()
        users.append(
            {
                "id": user_id,
                "workspace_id": workspace_id,
                "name": defn["name"],
                "email": f"{defn['name'].lower().replace(' ', '.')}@acmerecords.com",
                "role": defn["role"],
                "created_at": generate_timestamp(base_date),
                "updated_at": generate_timestamp(base_date, offset_days=3),
                "deleted_at": None,
                "metadata": {},
            }
        )

    user_ids = [u["id"] for u in users]

    # --- Vaults ---
    vault_definitions = [
        # Discover chamber (4)
        {
            "entity": "Henderson Co",
            "contract_type": "Distribution",
            "chamber": "discover",
            "gate": "triage",
        },
        {
            "entity": "Nova Entertainment",
            "contract_type": "Licensing",
            "chamber": "discover",
            "gate": "triage",
        },
        {
            "entity": "TechFlow Inc",
            "contract_type": "Publishing",
            "chamber": "discover",
            "gate": "intake",
        },
        {
            "entity": "Summit Media",
            "contract_type": "Master Use",
            "chamber": "discover",
            "gate": "intake",
        },
        # Build chamber (3)
        {
            "entity": "Ostereo Music Group",
            "contract_type": "Distribution",
            "chamber": "build",
            "gate": "assembly",
        },
        {
            "entity": "Warner Bros",
            "contract_type": "Sync License",
            "chamber": "build",
            "gate": "assembly",
        },
        {
            "entity": "Pinnacle Partners",
            "contract_type": "Co-Publishing",
            "chamber": "build",
            "gate": "drafting",
        },
        # Review chamber (2)
        {
            "entity": "Atlas Records",
            "contract_type": "Distribution",
            "chamber": "review",
            "gate": "legal_review",
        },
        {
            "entity": "MediaWorks LLC",
            "contract_type": "Licensing",
            "chamber": "review",
            "gate": "final_approval",
        },
        # Ship chamber (1)
        {
            "entity": "Acme Inc",
            "contract_type": "Master Agreement",
            "chamber": "ship",
            "gate": "execution",
        },
    ]

    vaults = []
    for i, defn in enumerate(vault_definitions):
        vault_id = generate_ulid()
        entity_slug = defn["entity"].lower().replace(" ", "-")
        created = generate_timestamp(base_date, offset_days=i * 3)
        vaults.append(
            {
                "id": vault_id,
                "workspace_id": workspace_id,
                "name": f"{defn['contract_type']} Agreement — Acme Records x {defn['entity']}",
                "slug": f"{defn['contract_type'].lower().replace(' ', '-')}-acme-x-{entity_slug}",
                "module_type": "contracts",
                "chamber": defn["chamber"],
                "gate": defn["gate"],
                "health_score": random.randint(50, 100),
                "metadata": {
                    "entity": defn["entity"],
                    "contract_type": defn["contract_type"],
                },
                "created_at": created,
                "updated_at": generate_timestamp(base_date, offset_days=i * 3 + 2),
                "deleted_at": None,
            }
        )

    vault_ids = [v["id"] for v in vaults]

    # --- Events ---
    event_types = [
        "extraction",
        "patch_created",
        "patch_submitted",
        "gate_advanced",
        "review_requested",
        "approval_granted",
    ]

    event_payloads = {
        "extraction": lambda v: {
            "source": "document_upload",
            "fields_extracted": random.randint(5, 25),
            "confidence_score": round(random.uniform(0.70, 0.99), 2),
        },
        "patch_created": lambda v: {
            "patch_id": generate_ulid(),
            "fields_modified": random.sample(
                ["territory", "effective_date", "term_length", "royalty_rate", "advance"],
                k=random.randint(1, 3),
            ),
        },
        "patch_submitted": lambda v: {
            "patch_id": generate_ulid(),
            "submitted_by_role": "builder",
        },
        "gate_advanced": lambda v: {
            "from_gate": v.get("gate", "unknown"),
            "to_gate": "next_gate",
            "auto_advanced": random.choice([True, False]),
        },
        "review_requested": lambda v: {
            "reviewer_role": "gatekeeper",
            "priority": random.choice(["normal", "high", "urgent"]),
        },
        "approval_granted": lambda v: {
            "approved_by_role": "owner",
            "conditions": [],
        },
    }

    events = []
    for i in range(20):
        vault_index = i % len(vault_ids)
        vault = vaults[vault_index]
        event_type = event_types[i % len(event_types)]
        actor_id = random.choice(user_ids)
        created = generate_timestamp(base_date, offset_days=i * 2 + 1)

        events.append(
            {
                "id": generate_ulid(),
                "vault_id": vault_ids[vault_index],
                "workspace_id": workspace_id,
                "event_type": event_type,
                "actor_id": actor_id,
                "payload": event_payloads[event_type](vault),
                "created_at": created,
            }
        )

    # --- Assemble output ---
    data = {
        "workspace": workspace,
        "users": users,
        "vaults": vaults,
        "events": events,
    }

    print(json.dumps(data, indent=2, default=str))


if __name__ == "__main__":
    main()
