#!/usr/bin/env python3
"""Brain Brigade seed — first production white-label instance at brainbrigade.xyz."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "apps", "api"))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from ulid import ULID

from src.db import Base
from src.lib.crypto import encrypt_token
from src.models.workspace import Workspace
from src.models.workspace_config import WorkspaceConfig
from src.models.user import User

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://airlock:airlock@localhost:5433/airlock"
)
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


def seed():
    db = Session()

    # ── Check if already seeded ──────────────────────────────────────
    existing = db.execute(
        select(Workspace).where(Workspace.slug == "brainbrigade")
    ).scalar_one_or_none()
    if existing:
        print(f"Workspace 'Brain Brigade' already exists ({existing.id}). Skipping seed.")
        db.close()
        return

    # ── Workspace ────────────────────────────────────────────────────
    ws_id = str(ULID())
    ws = Workspace(
        id=ws_id,
        name="Brain Brigade",
        slug="brainbrigade",
        metadata_={
            "persona": "maverick",
            "plan": "founder",
            "industry": "technology",
            "tagline": "AI-first contract operations",
        },
    )
    db.add(ws)
    db.flush()

    # ── Owner user (Zachary) ─────────────────────────────────────────
    zach_id = str(ULID())
    zach = User(
        id=zach_id,
        workspace_id=ws_id,
        email="rick@brainbrigade.xyz",
        display_name="Rick Holwerda",
        org_role="executive",
        metadata_={"persona": "maverick", "founder": True},
    )
    db.add(zach)
    db.flush()

    # ── Workspace Config (white-label settings) ─────────────────────
    # Encrypt the Anthropic API key if available in env
    ai_key_encrypted = None
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")

    ai_provider = None
    if anthropic_key:
        ai_key_encrypted = encrypt_token(anthropic_key)
        ai_provider = "anthropic"
    elif openrouter_key:
        ai_key_encrypted = encrypt_token(openrouter_key)
        ai_provider = "openrouter"

    config = WorkspaceConfig(
        id=str(ULID()),
        workspace_id=ws_id,
        # Domain
        custom_domain="brainbrigade.xyz",
        domain_verified=False,  # Will be true once DNS + Vercel configured
        # Branding
        accent_color="#00d1ff",  # Brain Brigade cyan
        logo_url=None,  # Will add logo later
        # Modules — all enabled for founder instance
        enabled_modules=["contracts", "crm", "triage", "calendar", "documents"],
        # AI
        ai_provider=ai_provider,
        ai_api_key_encrypted=ai_key_encrypted,
        ai_tier="managed" if ai_key_encrypted else "none",
        # Billing
        billing_tier="beta",
        # Limits — unlimited for founder
        max_users=999,
        max_vaults=999,
        # Metadata
        metadata_={"founding_instance": True, "provisioned_by": "brain-brigade-seed"},
    )
    db.add(config)

    # ── Commit ───────────────────────────────────────────────────────
    db.commit()

    print("=== Brain Brigade Seed Complete ===")
    print(f"Workspace:  {ws.name} ({ws.id})")
    print(f"Slug:       {ws.slug}")
    print(f"Owner:      {zach.display_name} ({zach.email})")
    print(f"Domain:     {config.custom_domain}")
    print(f"AI:         {config.ai_provider or 'none'} (tier: {config.ai_tier})")
    print(f"Modules:    {config.enabled_modules}")
    print(f"Billing:    {config.billing_tier}")
    print(f"Config ID:  {config.id}")
    db.close()


if __name__ == "__main__":
    seed()
