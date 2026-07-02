"""Shared test fixtures for the Airlock API."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Create a test client with lifespan events (startup/shutdown)."""
    with TestClient(app) as c:
        yield c
