from src.services.credit_service import (
    CreditService,
    FreeTierCapError,
    InsufficientCreditsError,
    OpusCapExceededError,
)


def test_insufficient_credits_error():
    err = InsufficientCreditsError(balance=10, required=50)
    assert err.balance == 10
    assert err.required == 50
    assert "have 10" in str(err)
    assert "need 50" in str(err)


def test_opus_cap_exceeded_error():
    err = OpusCapExceededError(used=30, cap=30)
    assert err.used == 30
    assert err.cap == 30
    assert "30/30" in str(err)


def test_free_tier_cap_error():
    err = FreeTierCapError()
    assert "Free tier" in str(err)


def test_credit_service_requires_db():
    """CreditService needs a database session."""
    svc = CreditService(db=None)
    assert svc.db is None
