"""Compatibility wrapper for the legacy ``models.py`` module.

This project historically exposed all SQLAlchemy models from a single
``models.py`` file that lives alongside this package.  Some parts of the
codebase (and a few third-party scripts) import models using
``from models import ...`` while newer tooling – notably Alembic – expects
``models`` to be a package.  When the package was introduced its
``__init__`` was left empty which meant any consumer importing ``models``
would see an empty namespace, triggering ``ImportError`` at runtime.

To preserve backwards compatibility we dynamically load the original module
and re-export all public attributes so both import styles keep working.
"""

from __future__ import annotations

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys
from types import ModuleType

__all__: list[str] = []

# Path to the historical ``models.py`` file (sibling of this package).
_LEGACY_MODULE_NAME = "_legacy_models_module"
_PACKAGE_DIR = Path(__file__).resolve().parent
_LEGACY_MODULE_PATH = _PACKAGE_DIR.parent / "models.py"


def _load_legacy_module() -> ModuleType:
    """Import the legacy ``models.py`` implementation once and return it."""

    existing = sys.modules.get(_LEGACY_MODULE_NAME)
    if isinstance(existing, ModuleType):
        return existing

    spec = spec_from_file_location(_LEGACY_MODULE_NAME, _LEGACY_MODULE_PATH)
    if spec is None or spec.loader is None:
        raise ImportError(
            f"Unable to load legacy models module at {_LEGACY_MODULE_PATH}"
        )

    module = module_from_spec(spec)
    sys.modules[_LEGACY_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


_legacy_module = _load_legacy_module()


def _should_export(name: str) -> bool:
    """Return ``True`` if the attribute should be re-exported."""

    if name.startswith("_"):
        return False
    return True


def _export_public_attributes(module: ModuleType) -> None:
    names = getattr(module, "__all__", None)
    if not names:
        names = [name for name in dir(module) if _should_export(name)]

    for name in names:
        if not _should_export(name):
            continue
        globals()[name] = getattr(module, name)
        __all__.append(name)


_export_public_attributes(_legacy_module)

