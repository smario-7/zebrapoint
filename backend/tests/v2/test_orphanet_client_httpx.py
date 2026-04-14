"""
Testy klienta Orphanet API z mockiem transportu httpx (bez sieci).
"""

from __future__ import annotations

import asyncio
from unittest.mock import patch

import httpx
import pytest

from app.services.v2.orphanet_client import OrphanetClient

_ORPHA = 999001


def _make_transport(requests_log: list[str]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        requests_log.append(str(request.url))
        path = request.url.path

        if path.endswith(f"/orphacode/{_ORPHA}/HPODisorderAssociation"):
            return httpx.Response(
                200,
                json={
                    "ORPHAcode": _ORPHA,
                    "HPODisorderAssociation": [
                        {"HPO": {"HPOId": "HP:0000002"}},
                        {"HPO": {"HPOId": "HP:0000001"}},
                        {"HPO": {"HPOId": "HP:0000001"}},
                    ],
                },
            )

        if path == f"/EN/ClinicalEntity/orphacode/{_ORPHA}":
            return httpx.Response(200, json={"Preferred term": "Fixture EN name"})

        if path == f"/PL/ClinicalEntity/orphacode/{_ORPHA}":
            return httpx.Response(200, json={"Preferred term": "Fixture PL name"})

        return httpx.Response(404, json={})

    return httpx.MockTransport(handler)


@pytest.fixture
def instant_orphanet_sleep(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _no_sleep(*_args: object, **_kwargs: object) -> None:
        return None

    monkeypatch.setattr(asyncio, "sleep", _no_sleep)


@pytest.mark.asyncio
async def test_get_disease_for_sync_calls_en_and_hpo_only(instant_orphanet_sleep) -> None:
    requests_log: list[str] = []
    transport = _make_transport(requests_log)
    real_client = httpx.AsyncClient

    def client_with_mock_transport(*args: object, **kwargs: object) -> httpx.AsyncClient:
        kwargs["transport"] = transport
        return real_client(*args, **kwargs)

    with patch("app.services.v2.orphanet_client.httpx.AsyncClient", side_effect=client_with_mock_transport):
        async with OrphanetClient(api_key="test-key") as client:
            d = await client.get_disease_for_sync(_ORPHA)

    assert d is not None
    assert d.name_en == "Fixture EN name"
    assert d.name_pl is None
    assert d.hpo_associations == ["HP:0000001", "HP:0000002"]
    assert d.orpha_code == f"ORPHA:{_ORPHA}"

    assert len(requests_log) == 2
    assert any(f"/EN/ClinicalEntity/orphacode/{_ORPHA}" in u and "HPODisorder" not in u for u in requests_log)
    assert any("HPODisorderAssociation" in u for u in requests_log)
    assert not any("/PL/ClinicalEntity/" in u for u in requests_log)


@pytest.mark.asyncio
async def test_get_disease_fetches_pl_en_hpo(instant_orphanet_sleep) -> None:
    requests_log: list[str] = []
    transport = _make_transport(requests_log)
    real_client = httpx.AsyncClient

    def client_with_mock_transport(*args: object, **kwargs: object) -> httpx.AsyncClient:
        kwargs["transport"] = transport
        return real_client(*args, **kwargs)

    with patch("app.services.v2.orphanet_client.httpx.AsyncClient", side_effect=client_with_mock_transport):
        async with OrphanetClient(api_key="test-key") as client:
            d = await client.get_disease(_ORPHA)

    assert d is not None
    assert d.name_en == "Fixture EN name"
    assert d.name_pl == "Fixture PL name"
    assert d.hpo_associations == ["HP:0000001", "HP:0000002"]

    assert len(requests_log) == 3
    assert sum(1 for u in requests_log if "/PL/ClinicalEntity/" in u) == 1
    assert sum(1 for u in requests_log if "/EN/ClinicalEntity/orphacode/" in u and "HPO" not in u) == 1


@pytest.mark.asyncio
async def test_get_hpo_associations_only_single_request_sorted(instant_orphanet_sleep) -> None:
    requests_log: list[str] = []
    transport = _make_transport(requests_log)
    real_client = httpx.AsyncClient

    def client_with_mock_transport(*args: object, **kwargs: object) -> httpx.AsyncClient:
        kwargs["transport"] = transport
        return real_client(*args, **kwargs)

    with patch("app.services.v2.orphanet_client.httpx.AsyncClient", side_effect=client_with_mock_transport):
        async with OrphanetClient(api_key="test-key") as client:
            hpo = await client.get_hpo_associations_only(_ORPHA)

    assert hpo == ["HP:0000001", "HP:0000002"]
    assert len(requests_log) == 1
    assert "HPODisorderAssociation" in requests_log[0]
