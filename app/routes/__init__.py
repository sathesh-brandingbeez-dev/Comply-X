"""Alias :mod:`backend.app.routes` under the historical ``app.routes`` path."""

from __future__ import annotations

import importlib
import sys
from types import ModuleType
from typing import Dict

_BACKEND_PREFIX = "backend.app.routes"
_KNOWN_MODULES = (
    "auth_ai",
    "calendar_ai",
    "document_ai",
    "fmea_ai",
    "incident_ai",
    "registration_ai",
    "risk_ai",
)

_loaded: Dict[str, ModuleType] = {}


def _load(name: str) -> ModuleType:
    module = importlib.import_module(f"{_BACKEND_PREFIX}.{name}")
    sys.modules[f"{__name__}.{name}"] = module
    return module


for _name in _KNOWN_MODULES:
    try:
        _loaded[_name] = _load(_name)
    except ModuleNotFoundError:  # pragma: no cover - optional routers
        continue

globals().update(_loaded)
__all__ = sorted(_loaded)


def __getattr__(name: str) -> ModuleType:  # pragma: no cover - dynamic access
    if name in _loaded:
        return _loaded[name]
    _loaded[name] = _load(name)
    return _loaded[name]


def __dir__() -> list[str]:  # pragma: no cover - debug helper
    return sorted(__all__)
