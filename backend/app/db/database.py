from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


engine_options = {
    "pool_pre_ping": True,
    "echo": settings.app_env == "development",
}

# Fail promptly when PostgreSQL is stopped or unreachable instead of leaving
# authentication requests waiting on the driver's much longer default.
if settings.database_url.startswith("postgresql"):
    engine_options.update(
        connect_args={"connect_timeout": 5},
        pool_timeout=5,
    )

engine = create_engine(settings.database_url, **engine_options)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
