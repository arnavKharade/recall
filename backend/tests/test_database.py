import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.database import engine, SessionLocal


def test_database_connection():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        assert result.scalar() == 1


def test_database_session():
    db = SessionLocal()

    try:
        result = db.execute(text("SELECT current_database()"))
        assert result.scalar() == "recall"
    finally:
        db.close()
