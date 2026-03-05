"""Auth middleware dependency tests."""

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from src.middleware.auth import get_current_user
from src.services.jwt import create_access_token

app = FastAPI()


@app.get("/protected")
async def protected_route(user: dict = Depends(get_current_user)):  # noqa: B008
    return {"user_id": user["sub"]}


client = TestClient(app)


def test_valid_token_passes():
    token = create_access_token({"sub": "user_123", "email": "test@example.com"})
    resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["user_id"] == "user_123"


def test_missing_token_returns_401():
    resp = client.get("/protected")
    assert resp.status_code == 401


def test_invalid_token_returns_401():
    resp = client.get("/protected", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401
