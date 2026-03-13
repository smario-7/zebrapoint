class TestRegister:
  def test_register_success(self, client):
    resp = client.post("/auth/register", json={
      "email": "nowy@test.pl",
      "password": "haslo1234",
      "display_name": "Nowy User"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "nowy@test.pl"
    assert data["display_name"] == "Nowy User"
    assert "password_hash" not in data

  def test_register_duplicate_email(self, client, registered_user):
    resp = client.post("/auth/register", json={
      "email": "test@zebrapoint.pl",
      "password": "inne_haslo",
      "display_name": "Duplikat"
    })
    assert resp.status_code == 409

  def test_register_short_password(self, client):
    resp = client.post("/auth/register", json={
      "email": "krotkie@test.pl",
      "password": "abc",
      "display_name": "User"
    })
    assert resp.status_code == 422

  def test_register_invalid_email(self, client):
    resp = client.post("/auth/register", json={
      "email": "to-nie-jest-email",
      "password": "haslo1234",
      "display_name": "User"
    })
    assert resp.status_code == 422


class TestLogin:
  def test_login_success(self, client, registered_user):
    resp = client.post("/auth/login", json={
      "email": "test@zebrapoint.pl",
      "password": "haslo1234"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "test@zebrapoint.pl"

  def test_login_wrong_password(self, client, registered_user):
    resp = client.post("/auth/login", json={
      "email": "test@zebrapoint.pl",
      "password": "zle_haslo"
    })
    assert resp.status_code == 401

  def test_login_nonexistent_email(self, client):
    resp = client.post("/auth/login", json={
      "email": "nieistnieje@test.pl",
      "password": "haslo1234"
    })
    assert resp.status_code == 401

  def test_same_error_for_wrong_email_and_wrong_password(self, client, registered_user):
    r1 = client.post("/auth/login", json={
      "email": "nieistnieje@test.pl",
      "password": "haslo1234"
    })
    r2 = client.post("/auth/login", json={
      "email": "test@zebrapoint.pl",
      "password": "zle_haslo"
    })
    assert r1.json()["detail"] == r2.json()["detail"]


class TestGetMe:
  def test_get_me_authenticated(self, client, auth_headers):
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@zebrapoint.pl"

  def test_get_me_unauthenticated(self, client):
    resp = client.get("/auth/me")
    assert resp.status_code == 403

  def test_get_me_invalid_token(self, client):
    resp = client.get("/auth/me", headers={"Authorization": "Bearer token-nieważny"})
    assert resp.status_code == 401

