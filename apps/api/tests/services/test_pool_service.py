"""Tests for pool service — import verification."""

from src.services.pool_service import GLOBAL_POOL_ID, PoolService


def test_pool_service_requires_db():
    svc = PoolService(db=None)
    assert svc.db is None


def test_global_pool_id():
    assert GLOBAL_POOL_ID == "pool_global"
