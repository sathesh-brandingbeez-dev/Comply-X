"""Runtime compatibility shims for backend dependencies."""
from __future__ import annotations

import logging
from types import SimpleNamespace

logger = logging.getLogger(__name__)


def ensure_passlib_bcrypt_compat() -> None:
    """Patch the ``bcrypt`` package so older Passlib versions keep working.

    Passlib 1.7 expects ``bcrypt.__about__.__version__`` to be present when it
    initialises the bcrypt backend. Recent releases of ``bcrypt`` (>=4.1) no
    longer ship the ``__about__`` module, which results in noisy tracebacks and
    in some environments prevents password verification altogether.  We
    gracefully provide the missing attribute by mirroring the canonical
    ``__version__`` attribute when available.
    """

    try:
        import bcrypt  # type: ignore
    except Exception as exc:  # pragma: no cover - import failure already logged by runtime
        logger.debug("Skipping bcrypt compatibility shim: import failed: %s", exc)
        return

    if getattr(bcrypt, "__about__", None) is not None:
        return

    version = getattr(bcrypt, "__version__", "0")
    bcrypt.__about__ = SimpleNamespace(__version__=version)
    logger.debug(
        "Patched bcrypt module with __about__.__version__=%s for Passlib compatibility.",
        version,
    )


# Apply compatibility fixes on import so every module benefits automatically.
ensure_passlib_bcrypt_compat()
