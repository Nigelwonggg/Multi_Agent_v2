"""
These ORM classes define the structure of the database tables used
to store chat sessions and messages. 
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.databases.chat_database import Base
from datetime import datetime


from app.utils.logging_config import get_logger
logger = get_logger("models.chat_data")

class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    title = Column(String, nullable=True)

    # A chat session has many messages. Cascade deletes ensure
    # associated messages are removed when a chat is deleted.
    messages = relationship(
        "Message",
        back_populates="chat",
        cascade="all, delete-orphan",
        order_by="Message.timestamp",
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("chats.id"), nullable=False, index=True)
    role = Column(String, nullable=False)  # e.g. "user" or "assistant"
    content = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)  # base64 image URL if applicable
    routes = Column(String, nullable=True)  # Route information if applicable
    evaluation = Column(String, nullable=True)  # Evaluation of the message
    is_rag_used = Column(Boolean, nullable=True)  # Whether RAG is needed
    docs = Column(Text, nullable=True)  # Text document IDs as JSON
    image_docs = Column(Text, nullable=True)  # Image document IDs as JSON (ADD THIS)
    processing_time = Column(Integer, nullable=True)  # Processing time in milliseconds
    timestamp = Column(DateTime, default=datetime.now())

    # Relationship back to the parent chat
    chat = relationship("Chat", back_populates="messages")