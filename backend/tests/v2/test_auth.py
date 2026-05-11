def test_openapi_contains_v2_auth_routes():
    from app.main import app

    paths = app.openapi()["paths"]
    assert "/api/v2/auth/register" in paths
    assert "/api/v2/auth/login" in paths
    assert "/api/v2/auth/logout" in paths
    assert "/api/v2/auth/refresh" in paths
    assert "/api/v2/auth/me" in paths
    assert "/api/v2/auth/check-nick" in paths
    assert "patch" in paths["/api/v2/auth/me"]
    assert "/api/v2/auth/onboarding" in paths
    assert "post" in paths["/api/v2/auth/onboarding"]
    assert "/api/v2/auth/orphanet/search" in paths
    assert "/api/v2/hpo/search" in paths
