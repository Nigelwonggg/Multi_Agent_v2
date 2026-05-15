"""
Database configuration and session management.

This module defines the SQLAlchemy engine, session factory, and base
class used by ORM models. It also exposes a `get_db` dependency
function for use with FastAPI endpoints.
"""

import os
from sqlalchemy import create_engine, inspect, text
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
    """Create database tables based on ORM models.

    Importing models inside this function avoids circular import
    issues. In a production setup with Alembic, you typically
    handle migrations separately and might not call this function.
    """
    # Import models here to ensure they are registered with the Base
    from app.models import chat_db_model, user_model, quiz, question

    Base.metadata.create_all(bind=engine)
    ensure_verified_identity_schema()
    ensure_quiz_schema()
    ensure_attempt_schema()
    logger.info("Chat database initialized and tables created.")
    
    # Create initial users
    create_initial_users()


def create_initial_users():
    """Create initial admin and student users if they don't exist."""
    from app.models.user_model import User
    from app.utils.auth_utils import get_password_hash
    
    db = SessionLocal()
    try:
        # Admin/Lecturer
        admin_email = "admin@test.com"
        if not db.query(User).filter(User.email == admin_email).first():
            admin_user = User(
                email=admin_email,
                hashed_password=get_password_hash("password123"),
                full_name="Admin Lecturer",
                role="lecturer",
                security_question="What is your pet's name?",
                security_answer="AdminPet"
            )
            db.add(admin_user)
            logger.info(f"Created default admin user: {admin_email}")

        # Student
        student_email = "student@test.com"
        if not db.query(User).filter(User.email == student_email).first():
            student_user = User(
                email=student_email,
                hashed_password=get_password_hash("password123"),
                full_name="Student Test",
                role="student",
                security_question="What is your pet's name?",
                security_answer="StudentPet"
            )
            db.add(student_user)
            logger.info(f"Created default student user: {student_email}")
            
        db.commit()
    except Exception as e:
        logger.error(f"Error creating initial users: {e}")
        db.rollback()
    finally:
        db.close()


def ensure_verified_identity_schema() -> None:
    """Apply lightweight schema updates for the verified identity registry."""
    inspector = inspect(engine)
    if "verified_identities" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("verified_identities")}
    if "unit_id" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE verified_identities ADD COLUMN unit_id VARCHAR"))
        logger.info("Added unit_id column to verified_identities table.")

    if "assigned_unit_ids" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE verified_identities ADD COLUMN assigned_unit_ids TEXT DEFAULT '[]' NOT NULL")
            )
        logger.info("Added assigned_unit_ids column to verified_identities table.")


def ensure_quiz_schema() -> None:
    """Apply lightweight schema updates for unit-aware quizzes."""
    inspector = inspect(engine)
    if "quizzes" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("quizzes")}

    if "unit_id" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE quizzes ADD COLUMN unit_id INTEGER"))
        logger.info("Added unit_id column to quizzes table.")

    if "created_by_user_id" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE quizzes ADD COLUMN created_by_user_id INTEGER"))
        logger.info("Added created_by_user_id column to quizzes table.")

    if "is_active" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE quizzes ADD COLUMN is_active INTEGER DEFAULT 0 NOT NULL"))
        logger.info("Added is_active column to quizzes table.")

    if "is_locked" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE quizzes ADD COLUMN is_locked INTEGER DEFAULT 0 NOT NULL"))
            connection.execute(text("UPDATE quizzes SET is_locked = 1 WHERE is_active = 1"))
        logger.info("Added is_locked column to quizzes table.")

    if "time_limit_minutes" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE quizzes ADD COLUMN time_limit_minutes INTEGER"))
        logger.info("Added time_limit_minutes column to quizzes table.")


def ensure_attempt_schema() -> None:
    """Apply lightweight schema updates for stored quiz review data."""
    inspector = inspect(engine)
    if "quiz_attempts" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("quiz_attempts")}

    if "answers_json" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE quiz_attempts ADD COLUMN answers_json TEXT"))
        logger.info("Added answers_json column to quiz_attempts table.")

    if "quiz_snapshot_json" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE quiz_attempts ADD COLUMN quiz_snapshot_json TEXT"))
        logger.info("Added quiz_snapshot_json column to quiz_attempts table.")


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
