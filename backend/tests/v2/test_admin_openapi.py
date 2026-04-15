def test_openapi_contains_v2_admin_routes():
    from app.main import app

    paths = app.openapi()["paths"]
    assert "/api/v2/admin/stats" in paths
    assert "/api/v2/admin/users" in paths
    assert "/api/v2/admin/lenses" in paths
    assert "/api/v2/admin/orphanet/search" in paths
    assert "/api/v2/admin/orphanet/import" in paths
    assert "/api/v2/admin/lens-proposals" in paths
