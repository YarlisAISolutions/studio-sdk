"""Deprecated alias of ``mybotbox.device_auth``; import that module instead (MBB-682)."""

from typing import Any

from mybotbox import device_auth as _impl
from mybotbox.device_auth import *  # noqa: F401,F403


def __getattr__(name: str) -> Any:
    """Delegate private and unlisted names to mybotbox.device_auth."""
    return getattr(_impl, name)
