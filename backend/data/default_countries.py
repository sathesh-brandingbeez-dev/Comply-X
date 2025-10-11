from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, List


def _catalogue_path() -> Path:
    """Return the shared JSON catalogue path."""

    base_dir = Path(__file__).resolve().parents[2]
    return base_dir / "shared" / "data" / "default_countries.json"


@lru_cache(maxsize=1)
def load_default_countries() -> List[dict[str, Any]]:
    """Load the default country options catalogue from disk."""

    path = _catalogue_path()
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError("default country catalogue must be a list of mappings")
    normalised: list[dict[str, Any]] = []
    for entry in data:
        if not isinstance(entry, dict):
            continue
        code = str(entry.get("code", "")).strip()
        name = str(entry.get("name", "")).strip()
        if not code or not name:
            continue
        normalised.append({"code": code.upper(), "name": name})
    return normalised


# Backwards-compatible constant import for existing modules.
DEFAULT_COUNTRY_OPTIONS: List[dict[str, Any]] = load_default_countries()

