"""Tests for role enforcement on vault routes."""

from src.services.permissions import (
    check_chamber_advance_permission,
)


class TestAdvanceRoutePermissions:
    """Verify permission logic that routes will use."""

    def test_builder_blocked_from_review_advance(self):
        """Builder cannot advance vault from review -> ship."""
        assert check_chamber_advance_permission("builder", "review") is False

    def test_gatekeeper_can_advance_review(self):
        """Gatekeeper can advance vault from review -> ship."""
        assert check_chamber_advance_permission("gatekeeper", "review") is True

    def test_owner_can_always_advance(self):
        """Owner can advance from any chamber."""
        for chamber in ("discover", "build", "review"):
            assert check_chamber_advance_permission("owner", chamber) is True

    def test_viewer_blocked_everywhere(self):
        """Viewer cannot advance from any chamber."""
        for chamber in ("discover", "build", "review"):
            assert check_chamber_advance_permission("viewer", chamber) is False
