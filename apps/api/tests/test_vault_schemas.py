"""Tests for vault Pydantic schemas."""

from datetime import UTC

import pytest
from pydantic import ValidationError

from src.schemas.vault import CreateVaultRequest, VaultResponse


def test_create_vault_request_valid():
    req = CreateVaultRequest(name="Test Vault", vault_type="contract")
    assert req.vault_level == 4
    assert req.metadata == {}


def test_create_vault_request_invalid_type():
    with pytest.raises(ValidationError):
        CreateVaultRequest(name="Test", vault_type="invalid")


def test_create_vault_request_invalid_level():
    with pytest.raises(ValidationError):
        CreateVaultRequest(name="Test", vault_type="contract", vault_level=5)


def test_create_vault_request_empty_name():
    with pytest.raises(ValidationError):
        CreateVaultRequest(name="", vault_type="contract")


def test_vault_response_from_attributes():
    from datetime import datetime

    now = datetime.now(UTC)
    resp = VaultResponse(
        id="test_id",
        workspace_id="ws_1",
        parent_vault_id=None,
        vault_level=4,
        name="Test",
        slug="test",
        vault_type="contract",
        module_type="contracts",
        chamber="discover",
        gate="gate_ingest",
        metadata={},
        health_score=None,
        created_at=now,
        updated_at=now,
        archived_at=None,
    )
    assert resp.id == "test_id"
