"""The deprecated ``ystudio`` import path keeps working and points at ``mybotbox``."""

import importlib
import subprocess
import sys
from pathlib import Path

import pytest

import mybotbox
import mybotbox.copilot_models
import mybotbox.device_auth

SDK_ROOT = Path(__file__).resolve().parent.parent


def _fresh_import_ystudio():
    for name in [m for m in sys.modules if m == "ystudio" or m.startswith("ystudio.")]:
        del sys.modules[name]
    return importlib.import_module("ystudio")


def test_importing_ystudio_warns_deprecation():
    with pytest.warns(DeprecationWarning, match="'ystudio' package is deprecated"):
        _fresh_import_ystudio()


def test_ystudio_reexports_the_same_objects():
    with pytest.warns(DeprecationWarning):
        ystudio = _fresh_import_ystudio()
    for name in mybotbox.__all__:
        assert getattr(ystudio, name) is getattr(mybotbox, name), name
    assert ystudio.__all__ == mybotbox.__all__
    assert ystudio.__version__ == mybotbox.__version__
    # Non-__all__ names still resolve (tests and users patch ystudio.requests).
    assert ystudio.requests is mybotbox.requests
    assert ystudio.YarlisClient is mybotbox.MyBotBoxClient


def test_ystudio_submodules_alias_mybotbox_submodules():
    with pytest.warns(DeprecationWarning):
        _fresh_import_ystudio()
    from ystudio import copilot_models, device_auth

    assert device_auth.device_login is mybotbox.device_auth.device_login
    assert device_auth.CLIENT_ID == mybotbox.device_auth.CLIENT_ID
    assert device_auth._config_paths is mybotbox.device_auth._config_paths
    assert copilot_models.COPILOT_MODELS is mybotbox.copilot_models.COPILOT_MODELS


@pytest.mark.parametrize(
    ("old", "new"),
    [("YStudioClient", "MyBotBoxClient"), ("YStudioError", "MyBotBoxError")],
)
def test_old_class_names_are_the_new_objects_and_warn(old, new):
    with pytest.warns(DeprecationWarning, match=f"{old} is deprecated; use {new}"):
        assert getattr(mybotbox, old) is getattr(mybotbox, new)
    with pytest.warns(DeprecationWarning):
        ystudio = _fresh_import_ystudio()
    with pytest.warns(DeprecationWarning, match=f"{old} is deprecated"):
        assert getattr(ystudio, old) is getattr(mybotbox, new)


def test_old_error_name_still_catches_new_errors():
    with pytest.warns(DeprecationWarning):
        legacy_error = mybotbox.YStudioError
    with pytest.raises(legacy_error):
        raise mybotbox.MyBotBoxError("boom")


def test_unknown_attribute_still_raises():
    with pytest.raises(AttributeError):
        mybotbox.NoSuchName  # noqa: B018


def test_importing_mybotbox_does_not_touch_ystudio():
    """The canonical path must not route through the deprecated alias."""
    code = "import mybotbox, sys; assert 'ystudio' not in sys.modules"
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=SDK_ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
