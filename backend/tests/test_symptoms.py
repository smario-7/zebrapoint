import pytest
from unittest.mock import patch

pytestmark = pytest.mark.skip(
    reason="Endpointy v1 usunięte z main — backend v2 (zobacz tests/v2/)."
)

from app.models.group import Group
from app.services.matching_service import GroupMatch

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
    "group_id": str(g.id),
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
    data = resp.json()
    assert "description" in data
    assert "match_score" in data


def _mock_find_top_matches(*_args, **_kwargs):
  """Zwraca listę GroupMatch do testów PATCH /symptoms/me i GET /my-matches."""
  return [
    GroupMatch(
      group_id="g1",
      name="Testowa",
      accent_color="#0d9488",
      score=0.9,
      score_pct=90,
      member_count=5,
      avg_match_score=0.85,
      keywords=["a", "b"],
      age_range=None,
      symptom_category="Neurologiczne",
      ai_description=None,
      admin_note=None,
      is_new_group=False,
    )
  ]


class TestUpdateSymptoms:

  @patch("app.routers.symptoms.find_top_matches", side_effect=_mock_find_top_matches)
  @patch("app.services.embedding_service.generate_embedding", return_value=MOCK_EMBEDDING)
  def test_update_description_success(self, mock_emb, mock_top, client, auth_headers):
    with patch("app.routers.symptoms.find_matching_group", side_effect=_mock_find_matching_group):
      client.post("/symptoms/", json={"description": "A" * 150}, headers=auth_headers)
    resp = client.patch("/symptoms/me", json={
      "description": "Zaktualizowany opis " + "x" * 80
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "matches" in data
    assert isinstance(data["matches"], list)
    assert len(data["matches"]) >= 2
    assert data["matches"][0]["group_id"] != data["matches"][1]["group_id"]
    assert data["matches"][1]["group_id"] == "g1"
    assert data["description"].startswith("Zaktualizowany opis")

  def test_update_description_no_profile(self, client, auth_headers):
    resp = client.patch("/symptoms/me", json={
      "description": "x" * 150
    }, headers=auth_headers)
    assert resp.status_code == 404

  def test_update_description_too_short(self, client, auth_headers):
    with patch("app.routers.symptoms.find_matching_group", side_effect=_mock_find_matching_group), \
         patch("app.services.embedding_service.generate_embedding", return_value=MOCK_EMBEDDING):
      client.post("/symptoms/", json={"description": "A" * 150}, headers=auth_headers)
    resp = client.patch("/symptoms/me", json={
      "description": "Za krótki"
    }, headers=auth_headers)
    assert resp.status_code == 422


@patch("app.routers.symptoms.find_matching_group", side_effect=_mock_find_matching_group)
@patch("app.services.embedding_service.generate_embedding", return_value=MOCK_EMBEDDING)
def test_choose_group_rejects_new(mock_emb, mock_find, client, auth_headers):
  """Wyboru 'stwórz nową grupę' nie można wysłać — API zwraca 400."""
  create_resp = client.post("/symptoms/", json={"description": "A" * 150}, headers=auth_headers)
  assert create_resp.status_code == 201
  profile_id = create_resp.json()["id"]

  resp = client.post(
    "/symptoms/choose-group",
    json={"profile_id": profile_id, "group_id": "__new__", "score": 0.0},
    headers=auth_headers,
  )
  assert resp.status_code == 400
  assert "nowej grupy" in resp.json().get("detail", "")

