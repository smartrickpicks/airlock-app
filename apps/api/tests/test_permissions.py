"""Tests for permission check service."""

from src.services.permissions import (
    ROLE_HIERARCHY,
    check_chamber_advance_permission,
    check_vault_permission,
)


class TestRoleHierarchy:
    def test_owner_is_highest(self):
        assert ROLE_HIERARCHY["owner"] > ROLE_HIERARCHY["gatekeeper"]

    def test_viewer_is_lowest(self):
        assert ROLE_HIERARCHY["viewer"] < ROLE_HIERARCHY["builder"]

    def test_all_roles_present(self):
        assert set(ROLE_HIERARCHY.keys()) == {"owner", "gatekeeper", "builder", "viewer"}


class TestCheckVaultPermission:
    def test_owner_can_do_anything(self):
        assert check_vault_permission("owner", "viewer") is True
        assert check_vault_permission("owner", "owner") is True

    def test_viewer_cannot_build(self):
        assert check_vault_permission("viewer", "builder") is False

    def test_builder_can_build(self):
        assert check_vault_permission("builder", "builder") is True

    def test_gatekeeper_can_build(self):
        assert check_vault_permission("gatekeeper", "builder") is True

    def test_builder_cannot_gatekeep(self):
        assert check_vault_permission("builder", "gatekeeper") is False


class TestCheckChamberAdvancePermission:
    def test_builder_can_advance_discover_to_build(self):
        assert check_chamber_advance_permission("builder", "discover") is True

    def test_builder_can_advance_build_to_review(self):
        assert check_chamber_advance_permission("builder", "build") is True

    def test_builder_cannot_advance_review_to_ship(self):
        assert check_chamber_advance_permission("builder", "review") is False

    def test_gatekeeper_can_advance_review_to_ship(self):
        assert check_chamber_advance_permission("gatekeeper", "review") is True

    def test_viewer_cannot_advance_anything(self):
        assert check_chamber_advance_permission("viewer", "discover") is False

    def test_owner_can_advance_anything(self):
        assert check_chamber_advance_permission("owner", "discover") is True
        assert check_chamber_advance_permission("owner", "review") is True
