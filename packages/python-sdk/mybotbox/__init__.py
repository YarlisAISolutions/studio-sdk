"""
MyBotBox SDK for Python (canonical import path).

This module is a thin re-export of `ystudio` so users can write:

    from mybotbox import MyBotBoxClient

Both `from mybotbox import ...` and `from ystudio import ...` work — the
underlying implementation lives in the `ystudio` package directory and
will until the next major release. New code should prefer `mybotbox`.
"""

from ystudio import (  # noqa: F401
    AsyncExecutionResult,
    MyBotBoxClient,
    MyBotBoxError,
    RateLimitInfo,
    UsageLimits,
    WorkflowExecutionResult,
    WorkflowStatus,
    __version__,
)

__all__ = [
    "MyBotBoxClient",
    "MyBotBoxError",
    "WorkflowExecutionResult",
    "WorkflowStatus",
    "AsyncExecutionResult",
    "RateLimitInfo",
    "UsageLimits",
]
