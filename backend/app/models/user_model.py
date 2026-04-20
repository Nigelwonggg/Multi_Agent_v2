from sqlalchemy import Column, Integer, String, DateTime
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
    student_id = Column(String, unique=True, index=True, nullable=True)

    # A user can have many chats
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")

class AllowedUser(Base):
    __tablename__ = "allowed_users"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False) # "student" or "lecturer"
    created_at = Column(DateTime, default=datetime.utcnow)
