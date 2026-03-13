from unittest.mock import patch


MOCK_EMBEDDING = [0.1] * 384


class TestSymptomProfile:

  @patch("app.services.embedding_service.generate_embedding", return_value=MOCK_EMBEDDING)
  def test_create_profile_success(self, mock_emb, client, auth_headers):
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

  @patch("app.services.embedding_service.generate_embedding", return_value=MOCK_EMBEDDING)
  def test_create_profile_duplicate(self, mock_emb, client, auth_headers):
    client.post("/symptoms/", json={"description": "A" * 150}, headers=auth_headers)
    resp = client.post("/symptoms/", json={"description": "B" * 150}, headers=auth_headers)
    assert resp.status_code == 409

  def test_get_my_profile_no_profile(self, client, auth_headers):
    resp = client.get("/symptoms/me", headers=auth_headers)
    assert resp.status_code == 404

  @patch("app.services.embedding_service.generate_embedding", return_value=MOCK_EMBEDDING)
  def test_get_my_profile_after_creation(self, mock_emb, client, auth_headers):
    client.post("/symptoms/", json={"description": "A" * 150}, headers=auth_headers)
    resp = client.get("/symptoms/me", headers=auth_headers)
    assert resp.status_code == 200

