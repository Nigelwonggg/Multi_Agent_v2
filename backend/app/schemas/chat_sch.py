from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
from app.utils.logging_config import get_logger
logger = get_logger("schemas.chat_sch")

class DomainDocReference(BaseModel):
    """Reference to a document with domain context"""
    doc_id: str
    domain: str

class MessageRequest(BaseModel):
    message: str
    thread_id: str
    config: Optional[Dict[str, Any]] = None

class MessageResponse(BaseModel):
    final_answer: str
    image_url: Optional[str] = None
    routes: Optional[List[str]] = None
    is_rag_used: Optional[bool] = None
    docs: Optional[Union[List[str], List[DomainDocReference]]] = None  # Support both legacy and new format
    image_docs: Optional[Union[List[str], List[DomainDocReference]]] = None  # Support both legacy and new format
    evaluation: Optional[str] = None
    processing_time: Optional[int] = None
    thread_id: Optional[str] = None
    timestamp: Optional[str] = None  # Add timestamp field

class MessagesRequest(BaseModel):
    thread_id: str

class MessageHistoryResponse(BaseModel):
    final_answer: str
    image_url: Optional[str] = None
    routes: List[str] = []
    is_rag_used: Optional[bool] = False  # Allow None, default to False
    docs: Optional[Union[List[str], List[DomainDocReference]]] = None  # Support both legacy and new format
    image_docs: Optional[Union[List[str], List[DomainDocReference]]] = None  # Support both legacy and new format
    evaluation: Optional[str] = ""       # Allow None, default to empty string
    processing_time: Optional[int] = 0   # Allow None, default to 0
    thread_id: str
    role: str
    timestamp: Optional[str] = None  # Add timestamp field


class MessagesResponse(BaseModel):
    messages: List[MessageHistoryResponse]  # Updated to use the new schema

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    """Schema representing a chat session in responses."""

    id: int
    title: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatsResponse(BaseModel):
    """Schema representing a list of chat sessions in responses."""

    chats: List[ChatResponse]

    class Config:
        from_attributes = True