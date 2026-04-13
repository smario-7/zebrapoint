# Testy DM (konwersacje 1:1) i walidacji nicku (check-nick, rejestracja)

import pytest

pytestmark = pytest.mark.skip(
    reason="Endpointy v1 usunięte z main — backend v2 (zobacz tests/v2/)."
)


class TestDM:

    def test_start_conversation(self, client, auth_headers, other_user):
        resp = client.post(
            f"/dm/start?other_user_id={other_user['id']}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert "id" in resp.json()

    def test_start_conversation_with_self_fails(self, client, auth_headers, registered_user):
        resp = client.post(
            f"/dm/start?other_user_id={registered_user['id']}",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_send_and_receive_message(self, client, auth_headers, other_user):
        conv = client.post(
            f"/dm/start?other_user_id={other_user['id']}",
            headers=auth_headers,
        ).json()

        resp = client.post(
            f"/dm/conversations/{conv['id']}/messages",
            json={"content": "Cześć!"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        assert resp.json()["content"] == "Cześć!"

    def test_list_conversations(self, client, auth_headers, conversation):
        resp = client.get("/dm/conversations", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    def test_cannot_access_other_conversation(self, client, auth_headers, other_conversation):
        resp = client.get(
            f"/dm/conversations/{other_conversation}/messages",
            headers=auth_headers,
        )
        assert resp.status_code == 404


class TestNickValidation:

    def test_register_duplicate_nick_409(self, client, registered_user):
        resp = client.post("/auth/register", json={
            "email": "other@test.pl",
            "password": "haslo1234",
            "display_name": registered_user["display_name"],
        })
        assert resp.status_code == 409
        data = resp.json()
        assert data["detail"]["field"] == "display_name"
        assert "suggestions" in data["detail"]
        assert len(data["detail"]["suggestions"]) > 0

    def test_check_nick_available(self, client):
        resp = client.get("/auth/check-nick?nick=NowyCiekawNick")
        assert resp.status_code == 200
        assert resp.json()["available"] is True

    def test_check_nick_taken(self, client, registered_user):
        resp = client.get(
            f"/auth/check-nick?nick={registered_user['display_name']}"
        )
        assert resp.status_code == 200
        assert resp.json()["available"] is False

    def test_check_nick_invalid_format(self, client):
        resp = client.get("/auth/check-nick?nick=nick ze spacją")
        assert resp.status_code == 200
        assert resp.json()["available"] is False
        assert resp.json()["reason"] == "format"
