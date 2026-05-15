from sqlalchemy import Boolean, Column, Integer, String, Text, ForeignKey
from app.databases.chat_database import Base

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    is_active = Column(Boolean, nullable=False, default=False)
    is_locked = Column(Boolean, nullable=False, default=False)
    time_limit_minutes = Column(Integer, nullable=True)
