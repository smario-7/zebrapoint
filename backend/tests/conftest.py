import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db


SQLALCHEMY_TEST_URL = "sqlite:///./test.db"

engine_test = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine_test
)


@pytest.fixture(autouse=True)
def setup_database(request):
  # test_ml_pipeline używa tylko mocków, bez SQLite (ARRAY/Vector nie są wspierane)
  if request.module.__name__.endswith("test_ml_pipeline"):
    yield
    return
  Base.metadata.create_all(bind=engine_test)
  yield
  Base.metadata.drop_all(bind=engine_test)


@pytest.fixture
def db():
  session = TestingSessionLocal()
  try:
    yield session
  finally:
    session.close()


@pytest.fixture
def mock_embedding_model():
  """Wyłącza ładowanie prawdziwego modelu sentence-transformers przy starcie aplikacji w testach."""
  with patch("app.main.get_model", return_value=MagicMock()):
    yield


@pytest.fixture
def client(db, mock_embedding_model):
  def override_get_db():
    try:
      yield db
    finally:
      pass

  app.dependency_overrides[get_db] = override_get_db
  with TestClient(app) as c:
    yield c
  app.dependency_overrides.clear()


@pytest.fixture
def registered_user(client):
  resp = client.post("/auth/register", json={
    "email": "test@zebrapoint.pl",
    "password": "haslo1234",
    "display_name": "Tester"
  })
  assert resp.status_code == 201
  return resp.json()


@pytest.fixture
def auth_headers(client, registered_user):
  resp = client.post("/auth/login", json={
    "email": "test@zebrapoint.pl",
    "password": "haslo1234"
  })
  token = resp.json()["access_token"]
  return {"Authorization": f"Bearer {token}"}

