"""Auth behavior: AuthExpiredError, credential auto-load, no-cred guard."""
import os

import pytest

from mybotbox import AuthExpiredError, MyBotBoxClient, MyBotBoxError


def _clear_env(monkeypatch, tmp_path):
    for var in ("MBB_API_KEY", "MYBOTBOX_TOKEN"):
        monkeypatch.delenv(var, raising=False)
    # Point the credential store at an empty dir so nothing is auto-loaded.
    monkeypatch.setenv("MYBOTBOX_CONFIG_DIR", str(tmp_path / "cfg"))


def test_auth_expired_is_a_mybotbox_error():
    err = AuthExpiredError()
    assert isinstance(err, MyBotBoxError)
    assert err.status == 401
    assert err.code == "AUTH_EXPIRED"


def test_no_credentials_raises_auth_expired(monkeypatch, tmp_path):
    _clear_env(monkeypatch, tmp_path)
    with pytest.raises(AuthExpiredError):
        MyBotBoxClient()


def test_auto_loads_mbb_api_key(monkeypatch, tmp_path):
    _clear_env(monkeypatch, tmp_path)
    monkeypatch.setenv("MBB_API_KEY", "sk-env")
    client = MyBotBoxClient(base_url="https://x.test")
    assert client.api_key == "sk-env"


def test_explicit_key_still_works(monkeypatch, tmp_path):
    _clear_env(monkeypatch, tmp_path)
    client = MyBotBoxClient(api_key="sk-explicit")
    assert client.api_key == "sk-explicit"
