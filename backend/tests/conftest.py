from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

import main
from main import app


@pytest.fixture(autouse=True)
def clear_stores() -> Iterator[None]:
    main.members.clear()
    main.tasks.clear()
    yield
    main.members.clear()
    main.tasks.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
