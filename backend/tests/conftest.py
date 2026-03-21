import os

os.environ.setdefault("ZP_DISABLE_RATE_LIMIT", "1")
# TestClient używa http://testserver — przeglądarka/httpx nie zachowuje ciasteczek Secure=True przez HTTP.
# Bez tego logowanie zwraca Set-Cookie, ale kolejne żądania idą bez sesji (401 w CI i lokalnie przy ENVIRONMENT=production).
os.environ["ENVIRONMENT"] = "development"
os.environ["COOKIE_SECURE"] = "false"

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

import app.routers.symptoms as symptoms_router
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
  Base.metadata.drop_all(bind=engine_test)
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
  # BackgroundTasks po POST/PUT symptoms używa SessionLocal — musi być ta sama baza co w teście.
  with patch.object(symptoms_router, "SessionLocal", TestingSessionLocal):
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
  assert resp.status_code == 200
  return {}


@pytest.fixture
def other_user(client):
  """Drugi użytkownik — do testów DM (konwersacja z registered_user)."""
  resp = client.post("/auth/register", json={
    "email": "other@zebrapoint.pl",
    "password": "haslo1234",
    "display_name": "OtherUser",
  })
  assert resp.status_code == 201
  return resp.json()


@pytest.fixture
def third_user(client):
  """Trzeci użytkownik — do testu braku dostępu do cudzej konwersacji."""
  resp = client.post("/auth/register", json={
    "email": "third@zebrapoint.pl",
    "password": "haslo1234",
    "display_name": "ThirdUser",
  })
  assert resp.status_code == 201
  return resp.json()


@pytest.fixture
def conversation(client, auth_headers, other_user):
  """Konwersacja między registered_user a other_user (istnieje przed testem)."""
  resp = client.post(
    f"/dm/start?other_user_id={other_user['id']}",
    headers=auth_headers,
  )
  assert resp.status_code == 200
  return resp.json()


@pytest.fixture
def other_conversation(client, registered_user, other_user, third_user):
  """
  Konwersacja między other_user a third_user.
  registered_user nie jest jej uczestnikiem — używane w test_cannot_access_other_conversation.
  Po utworzeniu konwersacji przywraca ciasteczko sesji registered_user (TestClient jest współdzielony).
  """
  login_resp = client.post("/auth/login", json={
    "email": "other@zebrapoint.pl",
    "password": "haslo1234",
  })
  assert login_resp.status_code == 200
  resp = client.post(
    f"/dm/start?other_user_id={third_user['id']}",
  )
  assert resp.status_code == 200
  conv_id = str(resp.json()["id"])
  restore = client.post("/auth/login", json={
    "email": registered_user["email"],
    "password": "haslo1234",
  })
  assert restore.status_code == 200
  return conv_id

