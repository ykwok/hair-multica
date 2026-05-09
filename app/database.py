"""Database setup and session management."""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings

_engine_kwargs = {}
if settings.database_url.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
    if ":memory:" in settings.database_url:
        _engine_kwargs["poolclass"] = StaticPool
        _engine_kwargs["pool_reset_on_return"] = None  # keep in-memory DB alive

engine = create_engine(settings.database_url, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Import models to ensure they are registered with Base.metadata
from app import models  # noqa: E402, F401


def get_db():
    """Yield a database session for dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
