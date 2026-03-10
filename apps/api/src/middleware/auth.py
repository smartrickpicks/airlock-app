"""Authentication middleware — FastAPI dependencies."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.config import settings
from src.services.jwt import verify_token

bearer_scheme = HTTPBearer(auto_error=False)

# Dev mock user payload — matches frontend AuthProvider dev_mock_token
_DEV_MOCK_PAYLOAD: dict = {
    "sub": "dev_user_001",
    "email": "dev@airlock.local",
    "workspace_id": "ws_dev",
    "org_role": "executive",
    "type": "access",
}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),  # noqa: B008
) -> dict:
    """Decode JWT from Authorization header. Raises 401 if invalid."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    # Allow dev mock token ONLY in development environment
    if credentials.credentials == "dev_mock_token" and settings.environment == "development":
        return _DEV_MOCK_PAYLOAD

    payload = verify_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return payload
