import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


# Database URL configuration
# Options: 'sqlite', 'local_postgres', 'external_postgres'
DB_TYPE = os.getenv("DB_TYPE", "sqlite")

if DB_TYPE == "sqlite":
    DATABASE_URL = "sqlite:///./comply_x.db"
elif DB_TYPE == "local_postgres":
    DATABASE_URL = "postgresql://logu@localhost/comply-x"
elif DB_TYPE == "external_postgres":
    DATABASE_URL = "postgresql://complyx_db_user:hAKDq5SpLibMuYxeAnQyPQUUTmJB2gh3@dpg-d2hh43ndiees73eheaq0-a.oregon-postgres.render.com/complyx_db"
else:
    # Fallback to environment variable or SQLite
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./comply_x.db")

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    # engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()