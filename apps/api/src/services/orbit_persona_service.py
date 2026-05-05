"""OrbitPersonaService — contextual persona generation from PI profiles.

Maps PI behavioral profiles to creator-branded archetypes.
Default set provides 5 diverse personas covering the behavioral spectrum.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.orbit_persona import OrbitPersona

DEFAULT_PERSONAS = [
    {
        "pi_profile": "persuader",
        "display_name": "The Influencer",
        "description": "Charismatic, persuasive, energetic",
        "traits": ["charismatic", "persuasive", "energetic"],
        "emoji": "\U0001f48e",  # 💎
        "order_index": 0,
    },
    {
        "pi_profile": "analyzer",
        "display_name": "The Strategist",
        "description": "Analytical, detail-oriented, methodical",
        "traits": ["analytical", "detail-oriented", "methodical"],
        "emoji": "\U0001f50d",  # 🔍
        "order_index": 1,
    },
    {
        "pi_profile": "guardian",
        "display_name": "The Loyal One",
        "description": "Reliable, principled, steady",
        "traits": ["reliable", "principled", "steady"],
        "emoji": "\U0001f6e1",  # 🛡
        "order_index": 2,
    },
    {
        "pi_profile": "venturer",
        "display_name": "The Bold Move",
        "description": "Adventurous, independent, risk-taking",
        "traits": ["adventurous", "independent", "risk-taking"],
        "emoji": "\U0001f680",  # 🚀
        "order_index": 3,
    },
    {
        "pi_profile": "collaborator",
        "display_name": "The Connector",
        "description": "Empathetic, supportive, team-oriented",
        "traits": ["empathetic", "supportive", "team-oriented"],
        "emoji": "\U0001f91d",  # 🤝
        "order_index": 4,
    },
]


class OrbitPersonaService:
    @staticmethod
    def generate_defaults(
        db: Session, orbit_profile_id: str, niche: str = ""
    ) -> list[OrbitPersona]:
        """Create 5 default OrbitPersona rows from the template.

        If niche is provided, appends it to each persona description.
        """
        personas = []
        for template in DEFAULT_PERSONAS:
            description = template["description"]
            if niche:
                description = f"{description} — {niche}"

            persona = OrbitPersona(
                id=str(ULID()),
                orbit_profile_id=orbit_profile_id,
                pi_profile=template["pi_profile"],
                display_name=template["display_name"],
                description=description,
                traits=template["traits"],
                emoji=template["emoji"],
                order_index=template["order_index"],
            )
            db.add(persona)
            personas.append(persona)
        db.flush()
        return personas

    @staticmethod
    def list_for_profile(db: Session, orbit_profile_id: str) -> list[OrbitPersona]:
        """Return all personas for a profile, ordered by order_index."""
        stmt = (
            select(OrbitPersona)
            .where(OrbitPersona.orbit_profile_id == orbit_profile_id)
            .order_by(OrbitPersona.order_index)
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def update(db: Session, persona_id: str, **kwargs) -> OrbitPersona:
        """Update display_name, description, traits, or emoji on a persona."""
        persona = db.get(OrbitPersona, persona_id)
        if not persona:
            raise ValueError(f"Persona not found: {persona_id}")
        allowed = {"display_name", "description", "traits", "emoji"}
        for key, value in kwargs.items():
            if key not in allowed:
                raise ValueError(f"Cannot update field: {key}")
            setattr(persona, key, value)
        db.flush()
        return persona

    @staticmethod
    def reorder(db: Session, order: list[str]) -> list[OrbitPersona]:
        """Reorder personas by setting order_index from the given ID list."""
        personas = []
        for idx, persona_id in enumerate(order):
            persona = db.get(OrbitPersona, persona_id)
            if not persona:
                raise ValueError(f"Persona not found: {persona_id}")
            persona.order_index = idx
            personas.append(persona)
        db.flush()
        return personas
