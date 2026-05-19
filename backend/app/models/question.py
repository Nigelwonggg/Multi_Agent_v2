from sqlalchemy import Column, Integer, String, Text, ForeignKey
from app.databases.chat_database import Base

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))

    type = Column(String)  # mcq or short
    question = Column(Text)
    options = Column(Text)  # JSON string
    answer = Column(Text)