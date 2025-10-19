"""Compatibility facade exposing :mod:`backend.app` as :mod:`app`.

Historically parts of the project imported AI helper routers via ``app.routes``.
Pytest still references this location, but the source now lives under
``backend.app``.  Import shims keep the legacy paths operational without
duplicating code.
"""
from __future__ import annotations

from importlib import import_module
from types import ModuleType
from typing import Iterable

_backend_app = import_module("backend.app")


def _iter_export_names(module: ModuleType) -> Iterable[str]:
    if hasattr(module, "__all__") and module.__all__:
        return module.__all__  # type: ignore[return-value]
    return (name for name in dir(module) if not name.startswith("_"))


def __getattr__(name: str):  # pragma: no cover - thin forwarding layer
    return getattr(_backend_app, name)


def __dir__() -> list[str]:  # pragma: no cover - debug helper
    return sorted(set(_iter_export_names(_backend_app)))
