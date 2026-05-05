"""OrbitService — profile CRUD + slug validation for Orbit creator pages."""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.orbit_profile import OrbitProfile
from src.models.orbit_section import OrbitSection

SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9\-]{1,62}[a-z0-9]$")

RESERVED_SLUGS = frozenset(
    {"admin", "api", "app", "blog", "help", "login", "orbit", "otto", "settings", "signup"}
)

DEFAULT_SECTIONS = [
    {"section_type": "hero", "title": "Hero", "order_index": 0, "content": {}},
    {"section_type": "links", "title": "Links", "order_index": 1, "content": {}},
    {"section_type": "persona_quiz", "title": "Persona Quiz", "order_index": 2, "content": {}},
    {"section_type": "contact", "title": "Contact", "order_index": 3, "content": {}},
]


class InvalidSlugError(Exception):
    def __init__(self, slug: str, reason: str):
        self.slug = slug
        self.reason = reason
        super().__init__(f"Invalid slug '{slug}': {reason}")


class OrbitService:
    @staticmethod
    def validate_slug(slug: str) -> bool:
        """Validate slug format and check reserved words.

        Returns True if valid, raises InvalidSlugError otherwise.
        """
        if not SLUG_PATTERN.match(slug):
            raise InvalidSlugError(
                slug, "must be 3-64 lowercase alphanumeric characters or hyphens"
            )
        if slug in RESERVED_SLUGS:
            raise InvalidSlugError(slug, "reserved word")
        return True

    @staticmethod
    def create_profile(
        db: Session,
        user_id: str,
        slug: str,
        display_name: str,
        tagline: str = "",
    ) -> OrbitProfile:
        """Create a new OrbitProfile after validating the slug."""
        OrbitService.validate_slug(slug)
        profile = OrbitProfile(
            id=str(ULID()),
            user_id=user_id,
            slug=slug,
            display_name=display_name,
            tagline=tagline,
        )
        db.add(profile)
        db.flush()
        return profile

    @staticmethod
    def get_by_slug(db: Session, slug: str) -> OrbitProfile | None:
        stmt = select(OrbitProfile).where(OrbitProfile.slug == slug)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_by_user_id(db: Session, user_id: str) -> OrbitProfile | None:
        stmt = select(OrbitProfile).where(OrbitProfile.user_id == user_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def update_profile(db: Session, profile_id: str, **kwargs) -> OrbitProfile:
        profile = db.get(OrbitProfile, profile_id)
        if not profile:
            raise ValueError(f"Profile not found: {profile_id}")
        for key, value in kwargs.items():
            setattr(profile, key, value)
        db.flush()
        return profile

    @staticmethod
    def add_default_sections(db: Session, profile_id: str) -> list[OrbitSection]:
        """Create the 4 default sections for a new Orbit profile."""
        sections = []
        for section_def in DEFAULT_SECTIONS:
            section = OrbitSection(
                id=str(ULID()),
                orbit_profile_id=profile_id,
                **section_def,
            )
            db.add(section)
            sections.append(section)
        db.flush()
        return sections
