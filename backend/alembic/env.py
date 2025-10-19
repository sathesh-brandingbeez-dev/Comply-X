# alembic/env.py
from __future__ import annotations
import os, sys, pathlib, importlib, pkgutil
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Alembic Config object
config = context.config

# --- Resolve DB URL (env first; fallback to local sqlite) ---
db_url = os.getenv("DATABASE_URL", "sqlite:///db.sqlite3")

# Normalize SQLite URLs that contain %20 (Windows paths with spaces) by switching to file: URI
def _normalize_sqlite_url(url: str) -> str:
    try:
        if url.startswith("sqlite") and "%20" in url and "file:" not in url:
            # Expect form sqlite:///<path-with-%20>
            if url.startswith("sqlite:///"):
                from urllib.parse import unquote
                path_part = url.split("sqlite:///", 1)[1]
                abs_path = unquote(path_part)  # turn %20 back into a space
                # Use SQLite URI so spaces are handled reliably
                return f"sqlite+pysqlite:///file:{abs_path}?uri=true"
    except Exception:
        # If anything odd happens, just return the original
        pass
    return url

db_url = _normalize_sqlite_url(db_url)
config.set_main_option("sqlalchemy.url", db_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- Make project package importable (puts backend/ on sys.path) ---
BASE_DIR = pathlib.Path(__file__).resolve().parents[1]  # .../backend
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# --- Import your SQLAlchemy Base and models (robustly) ---
Base = None

# Try common locations for Base; adjust/add if your project differs
for candidate in (
    "database",           # database.py exposing Base
    "models.base",        # models/base.py exposing Base
    "app.models.base",    # alternate app structure
    "backend.database",   # if used as a package
    "backend.models.base"
):
    try:
        mod = importlib.import_module(candidate)
        maybe_base = getattr(mod, "Base", None)
        if maybe_base is not None:
            Base = maybe_base
            break
    except Exception:
        continue

if Base is None:
    raise RuntimeError(
        "Alembic env.py could not import Base. "
        "Ensure database.py or models/base.py defines `Base = declarative_base()`."
    )

# Eager-import all model modules so tables are registered on Base.metadata
def _import_all_models(package_name: str) -> None:
    try:
        pkg = importlib.import_module(package_name)
    except Exception:
        return
    pkg_path = pathlib.Path(pkg.__file__).parent
    for m in [m.name for m in pkgutil.iter_modules([str(pkg_path)])]:
        if m.startswith("_"):
            continue
        if m in ("base",):  # skip base module if present
            continue
        try:
            importlib.import_module(f"{package_name}.{m}")
        except Exception:
            # Don't kill migrations if a single model import fails; you can tighten this later
            pass

# Try both flat and namespaced models packages
_import_all_models("models")
_import_all_models("backend.models")

target_metadata = Base.metadata

# ----------------- keep your existing functions below unchanged -----------------

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # helpful flags:
        compare_type=True,
        compare_server_default=True,
        render_as_batch=True,  # important for SQLite schema changes
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            render_as_batch=True,  # important for SQLite
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
