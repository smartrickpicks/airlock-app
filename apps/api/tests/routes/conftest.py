"""Route-level test fixtures — overrides for inference tests."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from src.config import settings
from src.main import app

PERSONA_REPO = "/Users/zacharyholwerda/Desktop/Airlock/repos/airlock-persona"


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Test client with persona_repo_path configured for inference engine."""
    original = settings.persona_repo_path
    settings.persona_repo_path = PERSONA_REPO
    try:
        with TestClient(app) as c:
            yield c
    finally:
        settings.persona_repo_path = original
