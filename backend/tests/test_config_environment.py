import pytest

from app.config import Settings

_MIN_SECRET = "x" * 32
_DB = "postgresql://u:p@localhost/test"


def _settings(**kwargs) -> Settings:
    base = {
        "database_url": _DB,
        "secret_key": _MIN_SECRET,
    }
    base.update(kwargs)
    return Settings(**base)


def test_cookie_secure_development_default_false():
    s = _settings(environment="development", cookie_secure=False)
    assert s.cookie_secure_flag() is False


def test_cookie_secure_staging_default_true():
    s = _settings(environment="staging", cookie_secure=False)
    assert s.cookie_secure_flag() is True


def test_cookie_secure_production_default_true():
    s = _settings(environment="production", cookie_secure=False)
    assert s.cookie_secure_flag() is True


def test_cookie_secure_forced_true_overrides_development():
    s = _settings(environment="development", cookie_secure=True)
    assert s.cookie_secure_flag() is True


def test_validate_development_allows_empty_origins_and_debug():
    s = _settings(
        environment="development",
        frontend_origins="",
        debug=True,
    )
    s.validate_environment_config()


def test_validate_production_requires_origins():
    s = _settings(environment="production", frontend_origins="", debug=False)
    with pytest.raises(ValueError, match="FRONTEND_ORIGINS"):
        s.validate_environment_config()


def test_validate_production_rejects_whitespace_only_origins():
    s = _settings(environment="production", frontend_origins="  , ,  ", debug=False)
    with pytest.raises(ValueError, match="FRONTEND_ORIGINS"):
        s.validate_environment_config()


def test_validate_production_accepts_comma_separated_origins():
    s = _settings(
        environment="production",
        frontend_origins=" https://a.pl ,https://b.pl ",
        debug=False,
    )
    s.validate_environment_config()


def test_validate_non_development_rejects_debug():
    s = _settings(
        environment="production",
        frontend_origins="https://app.example.com",
        debug=True,
    )
    with pytest.raises(ValueError, match="DEBUG"):
        s.validate_environment_config()
