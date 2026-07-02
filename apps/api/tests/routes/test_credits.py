"""Tests for credit endpoints — import verification only (no DB)."""

from src.routes.credits import router


def test_credits_router_exists():
    assert router.prefix == "/api/v1/credits"


def test_credits_router_has_balance_endpoint():
    routes = [r.path for r in router.routes]
    assert "/balance" in routes or "/api/v1/credits/balance" in routes


def test_credits_router_has_transactions_endpoint():
    routes = [r.path for r in router.routes]
    assert "/transactions" in routes or "/api/v1/credits/transactions" in routes


def test_credits_router_has_overage_endpoint():
    routes = [r.path for r in router.routes]
    assert "/overage" in routes or "/api/v1/credits/overage" in routes
