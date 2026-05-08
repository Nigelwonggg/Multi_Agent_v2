import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Fallback to local SQLite if no DATABASE_URL is provided
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chat.db")

# If the URL is just a filename (no protocol like sqlite:///), prepend sqlite:///
if DATABASE_URL and "://" not in DATABASE_URL:
    DATABASE_URL = f"sqlite:///{DATABASE_URL}"

# If using PostgreSQL (Cloud SQL), we don't need check_same_thread
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()