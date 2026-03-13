from unittest.mock import patch

from app.models.group import Group

MOCK_EMBEDDING = [0.1] * 384


def _mock_find_matching_group(db, embedding, user_id):
  """Zamiast zapytania pgvector (PostgreSQL) tworzy nową grupę w tej samej sesji — do testów na SQLite."""
  g = Group(
    name="Nowa grupa — oczekuje na dopasowania",
    description="Grupa tymczasowa.",
    is_active=True,
    member_count=0
  )
  db.add(g)
  db.flush()
  return {
    "group_id": g.id,
    "score": 0.0,
    "is_new": True,
    "group_name": g.name
  }


class TestSymptomProfile:

  @patch("app.routers.symptoms.find_matching_group", side_effect=_mock_find_matching_group)
  @patch("app.services.embedding_service.generate_embedding", return_value=MOCK_EMBEDDING)
  def test_create_profile_success(self, mock_emb, mock_find, client, auth_headers):
    resp = client.post("/symptoms/", json={
      "description": "A" * 150
    }, headers=auth_headers)

    assert resp.status_code == 201
    data = resp.json()
    assert "group_id" in data
    assert "match" in data
    assert data["match"]["is_new"] is True

  def test_create_profile_too_short(self, client, auth_headers):
    resp = client.post("/symptoms/", json={
      "description": "Za krótki"
    }, headers=auth_headers)
    assert resp.status_code == 422

  def test_create_profile_too_long(self, client, auth_headers):
    resp = client.post("/symptoms/", json={
      "description": "X" * 1001
    }, headers=auth_headers)
    assert resp.status_code == 422

  @patch("app.routers.symptoms.find_matching_group", side_effect=_mock_find_matching_group)
  @patch("app.services.embedding_service.generate_embedding", return_value=MOCK_EMBEDDING)
  def test_create_profile_duplicate(self, mock_emb, mock_find, client, auth_headers):
    client.post("/symptoms/", json={"description": "A" * 150}, headers=auth_headers)
    resp = client.post("/symptoms/", json={"description": "B" * 150}, headers=auth_headers)
    assert resp.status_code == 409

  def test_get_my_profile_no_profile(self, client, auth_headers):
    resp = client.get("/symptoms/me", headers=auth_headers)
    assert resp.status_code == 404

  @patch("app.routers.symptoms.find_matching_group", side_effect=_mock_find_matching_group)
  @patch("app.services.embedding_service.generate_embedding", return_value=MOCK_EMBEDDING)
  def test_get_my_profile_after_creation(self, mock_emb, mock_find, client, auth_headers):
    client.post("/symptoms/", json={"description": "A" * 150}, headers=auth_headers)
    resp = client.get("/symptoms/me", headers=auth_headers)
    assert resp.status_code == 200

