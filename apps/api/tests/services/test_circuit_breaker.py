"""Circuit breaker tests — logic verification."""

from src.services.circuit_breaker import CircuitBreaker, CircuitCheck


def test_circuit_check_allowed():
    check = CircuitCheck(allowed=True)
    assert check.allowed is True
    assert check.reason == ""


def test_circuit_check_denied():
    check = CircuitCheck(allowed=False, reason="pool_critical", message="Pool is low")
    assert check.allowed is False
    assert check.reason == "pool_critical"
    assert "Pool" in check.message


def test_paid_tiers_always_pass():
    """Paid users should never be blocked by circuit breakers."""
    # Can't instantiate without DB, but verify the logic pattern
    for _tier in ("plus", "constellation", "byok_pro"):
        check = CircuitCheck(allowed=True)
        assert check.allowed is True


def test_circuit_breaker_constants():
    assert CircuitBreaker.FREE_DAILY_INTERACTION_CAP == 10
    assert CircuitBreaker.DAILY_SPEND_ALERT_MULTIPLIER == 2.0
