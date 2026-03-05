"""JWT creation and verification tests."""

from src.services.jwt import create_access_token, create_refresh_token, verify_token


def test_create_and_verify_access_token():
    payload = {"sub": "user_123", "email": "test@example.com"}
    token = create_access_token(payload)
    decoded = verify_token(token)
    assert decoded["sub"] == "user_123"
    assert decoded["email"] == "test@example.com"
    assert decoded["type"] == "access"


def test_create_and_verify_refresh_token():
    payload = {"sub": "user_123"}
    token = create_refresh_token(payload)
    decoded = verify_token(token)
    assert decoded["sub"] == "user_123"
    assert decoded["type"] == "refresh"


def test_verify_invalid_token():
    result = verify_token("invalid.token.here")
    assert result is None


def test_verify_wrong_type():
    token = create_access_token({"sub": "user_123"})
    decoded = verify_token(token)
    assert decoded["type"] == "access"
