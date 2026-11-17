"""Deprecated alias of ``mybotbox.copilot_models``; import that module instead (MBB-682)."""

from typing import Any

from mybotbox import copilot_models as _impl
from mybotbox.copilot_models import *  # noqa: F401,F403


def __getattr__(name: str) -> Any:
    """Delegate private and unlisted names to mybotbox.copilot_models."""
    return getattr(_impl, name)
