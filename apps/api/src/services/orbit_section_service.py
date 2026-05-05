"""OrbitSectionService — CRUD, reorder, and visibility for Orbit page sections."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.orbit_section import OrbitSection

VALID_SECTION_TYPES = frozenset(
    {
        "hero",
        "rich_media",
        "links",
        "showcase",
        "persona_quiz",
        "testimonials",
        "merch",
        "contact",
        "blog_feed",
        "audience_pulse",
    }
)


class InvalidSectionTypeError(Exception):
    def __init__(self, section_type: str):
        self.section_type = section_type
        super().__init__(
            f"Invalid section type '{section_type}'. "
            f"Must be one of: {', '.join(sorted(VALID_SECTION_TYPES))}"
        )


class OrbitSectionService:
    @staticmethod
    def create(
        db: Session,
        orbit_profile_id: str,
        section_type: str,
        title: str,
        content: dict | None = None,
    ) -> OrbitSection:
        if section_type not in VALID_SECTION_TYPES:
            raise InvalidSectionTypeError(section_type)

        # Auto-increment order_index
        max_idx = db.execute(
            select(func.max(OrbitSection.order_index)).where(
                OrbitSection.orbit_profile_id == orbit_profile_id
            )
        ).scalar()
        next_index = (max_idx or 0) + 1 if max_idx is not None else 0

        section = OrbitSection(
            id=str(ULID()),
            orbit_profile_id=orbit_profile_id,
            section_type=section_type,
            title=title,
            order_index=next_index,
            is_visible=True,
            content=content or {},
        )
        db.add(section)
        db.flush()
        return section

    @staticmethod
    def list_for_profile(
        db: Session,
        orbit_profile_id: str,
        visible_only: bool = False,
    ) -> list[OrbitSection]:
        stmt = (
            select(OrbitSection)
            .where(OrbitSection.orbit_profile_id == orbit_profile_id)
            .order_by(OrbitSection.order_index)
        )
        if visible_only:
            stmt = stmt.where(OrbitSection.is_visible == True)  # noqa: E712
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get(db: Session, section_id: str) -> OrbitSection | None:
        return db.get(OrbitSection, section_id)

    @staticmethod
    def update_content(db: Session, section_id: str, content: dict) -> OrbitSection:
        section = db.get(OrbitSection, section_id)
        if not section:
            raise ValueError(f"Section not found: {section_id}")
        section.content = content
        db.flush()
        return section

    @staticmethod
    def reorder(db: Session, order: list[tuple[str, int]]) -> None:
        """Reorder sections. Takes list of (section_id, new_index) tuples."""
        for section_id, new_index in order:
            section = db.get(OrbitSection, section_id)
            if section:
                section.order_index = new_index
        db.flush()

    @staticmethod
    def toggle_visibility(db: Session, section_id: str, is_visible: bool) -> OrbitSection:
        section = db.get(OrbitSection, section_id)
        if not section:
            raise ValueError(f"Section not found: {section_id}")
        section.is_visible = is_visible
        db.flush()
        return section

    @staticmethod
    def delete(db: Session, section_id: str) -> None:
        section = db.get(OrbitSection, section_id)
        if section:
            db.delete(section)
            db.flush()
