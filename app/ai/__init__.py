"""Expose AI helper modules via the legacy ``app.ai`` namespace."""
from __future__ import annotations

import importlib
import sys
from types import ModuleType
from typing import Dict

_BACKEND_PREFIX = "backend.app.ai"
_loaded: Dict[str, ModuleType] = {}


def _load(name: str) -> ModuleType:
    module = importlib.import_module(f"{_BACKEND_PREFIX}.{name}")
    sys.modules[f"{__name__}.{name}"] = module
    return module


__all__: list[str] = []


def __getattr__(name: str) -> ModuleType:  # pragma: no cover - dynamic access
    if name in _loaded:
        return _loaded[name]
    module = _load(name)
    _loaded[name] = module
    if name not in __all__:
        __all__.append(name)
        __all__.sort()
    return module


def __dir__() -> list[str]:  # pragma: no cover - debug helper
    return list(__all__)
