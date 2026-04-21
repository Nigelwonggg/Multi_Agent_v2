"""
Database configuration and session management.

This module defines the SQLAlchemy engine, session factory, and base
class used by ORM models. It also exposes a `get_db` dependency
function for use with FastAPI endpoints.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session, declarative_base
from dotenv import load_dotenv

load_dotenv()

# SQLite is used here for simplicity. Update the URL to point to a
# different database such as PostgreSQL in production via .env
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# If the URL is just a filename (no protocol like sqlite:///), prepend sqlite:///
if SQLALCHEMY_DATABASE_URL and "://" not in SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{SQLALCHEMY_DATABASE_URL}"

# Import centralized logging
from app.utils.logging_config import get_logger
logger = get_logger("databases.chat_database")

# When using SQLite with multithreading (which FastAPI does), set
# check_same_thread=False. Other databases don't require this.
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)

# Create a configured "Session" class. Disable autocommit and
# autoflush to have explicit control over transactions.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative models
Base = declarative_base()


def init_db() -> None:
    """Create database tables based on ORM models."""
    # Import models here to ensure they are registered with the Base
    from app.models import chat_db_model, user_model, quiz, question

    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized and all tables created.")


def get_db():
    """Provide a SQLAlchemy session to path operations.

    This generator yields a session and ensures it is closed after
    the request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()