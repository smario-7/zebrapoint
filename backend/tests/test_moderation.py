import uuid

import pytest

from app.models.report import Report
from app.models.user import User


@pytest.fixture
def admin_user(client, db):
    """Rejestruje drugiego użytkownika i nadaje mu rolę admin."""
    client.post("/auth/register", json={
        "email": "admin@zebrapoint.pl",
        "password": "haslo1234",
        "display_name": "Admin"
    })
    user = db.query(User).filter(User.email == "admin@zebrapoint.pl").first()
    user.role = "admin"
    db.commit()
    return {"email": "admin@zebrapoint.pl", "password": "haslo1234", "id": str(user.id)}


@pytest.fixture
def admin_headers(client, admin_user):
    """Nagłówki auth dla użytkownika z rolą admin."""
    resp = client.post("/auth/login", json={
        "email": admin_user["email"],
        "password": admin_user["password"]
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def report_fixture(db, registered_user):
    """Tworzy jedno zgłoszenie w statusie pending, zwraca report_id."""
    post_id = uuid.uuid4()
    r = Report(
        reporter_id=uuid.UUID(registered_user["id"]),
        target_type="post",
        target_id=post_id,
        reason="spam",
        status="pending"
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return str(r.id)


@pytest.fixture
def banned_auth_headers(client, db, registered_user):
    """Użytkownik z banem — ustawiamy is_banned na istniejącym userze."""
    user = db.query(User).filter(User.email == "test@zebrapoint.pl").first()
    user.is_banned = True
    db.commit()
    resp = client.post("/auth/login", json={
        "email": "test@zebrapoint.pl",
        "password": "haslo1234"
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestReports:

    def test_create_report_success(self, client, auth_headers):
        post_id = str(uuid.uuid4())
        resp = client.post("/reports/", json={
            "target_type": "post",
            "target_id": post_id,
            "reason": "spam"
        }, headers=auth_headers)
        assert resp.status_code == 201
        assert "message" in resp.json()

    def test_create_report_invalid_reason(self, client, auth_headers):
        post_id = str(uuid.uuid4())
        resp = client.post("/reports/", json={
            "target_type": "post",
            "target_id": post_id,
            "reason": "invalid_reason"
        }, headers=auth_headers)
        assert resp.status_code == 422

    def test_duplicate_report_returns_201(self, client, auth_headers):
        post_id = str(uuid.uuid4())
        data = {"target_type": "post", "target_id": post_id, "reason": "spam"}
        client.post("/reports/", json=data, headers=auth_headers)
        resp = client.post("/reports/", json=data, headers=auth_headers)
        assert resp.status_code == 201

    def test_banned_user_cannot_report(self, client, banned_auth_headers):
        post_id = str(uuid.uuid4())
        resp = client.post("/reports/", json={
            "target_type": "post",
            "target_id": post_id,
            "reason": "spam"
        }, headers=banned_auth_headers)
        assert resp.status_code == 403


class TestAdminActions:

    def test_list_reports_requires_admin(self, client, auth_headers):
        resp = client.get("/admin/reports", headers=auth_headers)
        assert resp.status_code == 403

    def test_dismiss_report(self, client, admin_headers, report_fixture):
        report_id = report_fixture
        resp = client.post(
            f"/admin/reports/{report_id}/action",
            json={"action_type": "dismiss"},
            headers=admin_headers
        )
        assert resp.status_code == 200
        assert resp.json()["action_type"] == "dismiss"

    def test_cannot_action_already_reviewed(self, client, admin_headers, report_fixture):
        report_id = report_fixture
        client.post(
            f"/admin/reports/{report_id}/action",
            json={"action_type": "dismiss"},
            headers=admin_headers
        )
        resp = client.post(
            f"/admin/reports/{report_id}/action",
            json={"action_type": "dismiss"},
            headers=admin_headers
        )
        assert resp.status_code == 400
