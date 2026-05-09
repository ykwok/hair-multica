"""Pytest fixtures."""

import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

# Must set env BEFORE importing app modules
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["STORAGE_LOCAL_PATH"] = tempfile.mkdtemp()
os.environ["STORAGE_BASE_URL"] = "http://localhost:8000/uploads"
os.environ["LLM_PROVIDER"] = "mock"

from app import database as db_module  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

# Use the SAME engine that app.main already imported and bound
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_module.engine)


def override_get_db():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def client():
    Base.metadata.create_all(bind=db_module.engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=db_module.engine)
