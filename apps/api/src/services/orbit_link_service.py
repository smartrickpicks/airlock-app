"""OrbitLinkService — CRUD and click tracking for Orbit link-in-bio entries."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.orbit_link import OrbitLink


class OrbitLinkService:
    @staticmethod
    def create(
        db: Session,
        orbit_profile_id: str,
        title: str,
        url: str,
        icon: str | None = None,
    ) -> OrbitLink:
        # Auto-increment order_index
        max_idx = db.execute(
            select(func.max(OrbitLink.order_index)).where(
                OrbitLink.orbit_profile_id == orbit_profile_id
            )
        ).scalar()
        next_index = (max_idx or 0) + 1 if max_idx is not None else 0

        link = OrbitLink(
            id=str(ULID()),
            orbit_profile_id=orbit_profile_id,
            title=title,
            url=url,
            icon=icon,
            order_index=next_index,
        )
        db.add(link)
        db.flush()
        return link

    @staticmethod
    def record_click(
        db: Session,
        link_id: str,
        orbit_profile_id: str,
        fan_id: str | None = None,
        referrer: str | None = None,
        user_agent: str | None = None,
        utm_source: str | None = None,
        utm_medium: str | None = None,
        utm_campaign: str | None = None,
    ) -> OrbitLink:
        """Increment click_count on the link. Extra params reserved for future analytics."""
        link = db.get(OrbitLink, link_id)
        if not link:
            raise ValueError(f"Link not found: {link_id}")
        link.click_count = (link.click_count or 0) + 1
        db.flush()
        return link

    @staticmethod
    def get_link_stats(db: Session, orbit_profile_id: str) -> list[dict]:
        """Return list of link dicts with click_count for a profile."""
        stmt = (
            select(OrbitLink)
            .where(OrbitLink.orbit_profile_id == orbit_profile_id)
            .order_by(OrbitLink.order_index)
        )
        links = db.execute(stmt).scalars().all()
        return [
            {
                "id": link.id,
                "title": link.title,
                "url": link.url,
                "icon": link.icon,
                "click_count": link.click_count,
                "order_index": link.order_index,
            }
            for link in links
        ]

    @staticmethod
    def reorder(db: Session, order: list[tuple[str, int]]) -> None:
        """Reorder links. Takes list of (link_id, new_index) tuples."""
        for link_id, new_index in order:
            link = db.get(OrbitLink, link_id)
            if link:
                link.order_index = new_index
        db.flush()

    @staticmethod
    def delete(db: Session, link_id: str) -> None:
        link = db.get(OrbitLink, link_id)
        if link:
            db.delete(link)
            db.flush()
