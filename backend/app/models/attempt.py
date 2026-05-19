from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.databases.chat_database import Base

class Attempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    score = Column(Integer)
    total_questions = Column(Integer)
    answers_json = Column(Text, nullable=True)
    quiz_snapshot_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
