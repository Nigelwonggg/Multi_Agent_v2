from sqlalchemy import Column, Integer, String, Text
from app.databases.chat_database import Base

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)