from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.databases.chat_database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="student") # "student" or "lecturer"
    security_question = Column(String, nullable=True)
    security_answer = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # A user can have many chats
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    uploaded_identity_records = relationship(
        "VerifiedIdentity",
        back_populates="uploaded_by_user",
        foreign_keys="VerifiedIdentity.uploaded_by_user_id",
    )
    claimed_identity_records = relationship(
        "VerifiedIdentity",
        back_populates="claimed_by_user",
        foreign_keys="VerifiedIdentity.claimed_by_user_id",
    )


class VerifiedIdentity(Base):
    __tablename__ = "verified_identities"

    id = Column(Integer, primary_key=True, index=True)
    institutional_id = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    unit_id = Column(String, nullable=True)
    assigned_unit_ids = Column(Text, nullable=False, default="[]")
    role = Column(String, nullable=False)
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    claimed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    uploaded_by_user = relationship(
        "User",
        back_populates="uploaded_identity_records",
        foreign_keys=[uploaded_by_user_id],
    )
    claimed_by_user = relationship(
        "User",
        back_populates="claimed_identity_records",
        foreign_keys=[claimed_by_user_id],
    )


class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    unit_code = Column(String, unique=True, index=True, nullable=False)
    unit_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
