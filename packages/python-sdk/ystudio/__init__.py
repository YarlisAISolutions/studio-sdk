"""
Deprecated alias of the ``mybotbox`` package.

``ystudio`` is the SDK's pre-rename import name. It re-exports ``mybotbox``
unchanged, so every name resolves to the SAME object (``ystudio.MyBotBoxClient
is mybotbox.MyBotBoxClient``), and it warns once on import. New code should use:

    from mybotbox import MyBotBoxClient

This alias stays until the next major release (MBB-682).
"""

import warnings
from typing import Any

import mybotbox as _impl
from mybotbox import *  # noqa: F401,F403
from mybotbox import __all__, __version__  # noqa: F401

warnings.warn(
    "The 'ystudio' package is deprecated; import 'mybotbox' instead "
    "(same API, same objects).",
    DeprecationWarning,
    stacklevel=2,
)


def __getattr__(name: str) -> Any:
    """Delegate everything else (YStudioClient, YarlisClient, requests, ...) to mybotbox."""
    return getattr(_impl, name)
