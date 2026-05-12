import base64
import os
import time
import json
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from langchain_core.messages import HumanMessage, AIMessage
from sqlalchemy.orm import Session
from app.schemas.chat_sch import (
    MessageRequest, MessageResponse, MessagesRequest, 
    ChatResponse, MessagesResponse, MessageHistoryResponse,
    ChatsResponse, ChatTitleUpdate
)
from app.graph_logics.chat_graph import chat_graph 
from app.databases.chat_database import get_db
from app.models.chat_db_model import Chat, Message
from app.models.user_model import User
from app.utils.auth_utils import get_current_user
from app.services.session_service import get_session_service

from app.utils.logging_config import get_logger
logger = get_logger("api.routes.chat")

router = APIRouter()


def get_graph_recursion_limit() -> int:
    try:
        return max(4, int(os.getenv("CHAT_GRAPH_RECURSION_LIMIT", "8")))
    except (TypeError, ValueError):
        return 8


def generate_request_id() -> str:
    """Generate a unique request ID for tracking"""
    return str(int(time.time() * 1000) % 10000)

def log_request_start(request_id: str, message: str, thread_id: str) -> None:
    """Log the start of a request"""
    logger.info(f"💬 [REQ-{request_id}] New chat request - Thread: {thread_id}")
    logger.info(f"📝 [REQ-{request_id}] Message: '{message}'")

def log_request_end(request_id: str, routes: str, is_rag_needed: bool, processing_time: int) -> None:
    """Log the end of a request"""
    logger.info(f"✅ [REQ-{request_id}] Response generated successfully")
    logger.info(f"📈 [REQ-{request_id}] Stats - Route: {routes}, RAG: {is_rag_needed}, Time: {processing_time}ms")

def extract_response_data(result: Dict[str, Any]) -> Tuple:
    """Extract response data from LangGraph result"""
    answer = result.get("final_answer", "I received your message.")
    
    image_doc = result.get("selected_image")
    image_data = None
    if image_doc and hasattr(image_doc, 'metadata'):
        image_data = image_doc.metadata.get("base64_image")

    routes = json.dumps(result.get("routes", []))

    # Extract domain-aware text documents
    used_docs = result.get("used_docs", [])  # New domain-aware structure
    # For backward compatibility, also check legacy "docs" field
    legacy_docs = result.get("docs", [])
    
    # Convert to domain-aware format if legacy docs exist
    text_doc_references = []
    if used_docs:
        text_doc_references = used_docs  # Already in correct format
    elif legacy_docs:
        # Convert legacy format to domain-aware (assume data_science domain)
        text_doc_references = [{"doc_id": doc_id, "domain": "data_science"} for doc_id in legacy_docs]
    
    # Extract domain-aware image documents
    used_image = result.get("used_image")  # New domain-aware structure
    image_doc_references = []
    if used_image:
        image_doc_references = [used_image]  # Single image in list format
    elif image_doc and hasattr(image_doc, 'metadata'):
        # Fallback for legacy image handling - extract domain from metadata if available
        domain = image_doc.metadata.get("domain", "data_science")  # Default to data_science if no domain specified
        image_doc_references = [{
            "doc_id": image_doc.metadata.get("doc_id"),
            "domain": domain
        }]
    
    logger.debug(f"📄 Text doc references: {text_doc_references}")
    logger.debug(f"🖼️ Image doc references: {image_doc_references}")
    
    is_rag_used = result.get("is_rag_needed") and (len(text_doc_references) > 0 or len(image_doc_references) > 0)
    
    evaluation = result.get("evaluation", "")
    return answer, image_data, routes, is_rag_used, evaluation, text_doc_references, image_doc_references

def convert_image_to_base64(image_data) -> Optional[str]:
    """Convert various image formats to base64 string."""
    logger.debug("🖼️ Converting image data to base64...")
    
    if not image_data:
        return None
    
    if isinstance(image_data, str):
        logger.debug(f"✅ Image is already string, length: {len(image_data)}")
        return image_data
    elif isinstance(image_data, bytes):
        logger.debug(f"🔄 Converting bytes to base64, size: {len(image_data)} bytes")
        return base64.b64encode(image_data).decode('utf-8')
    elif hasattr(image_data, 'read'):  # File-like object
        logger.debug("📁 Reading file-like object for base64 conversion")
        return base64.b64encode(image_data.read()).decode('utf-8')
    else:
        logger.warning(f"⚠️ Unknown image data type: {type(image_data)}")
        return None


@router.post("/api/chat/message", response_model=MessageResponse)
async def chat(
    request: MessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> MessageResponse:
    """
    Main chat endpoint - processes messages through LangGraph
    """

    start_time = time.time()
    request_id = generate_request_id()
    thread_id = request.thread_id
    message = request.message

    # Get session service
    session_service = get_session_service()

    chat = db.query(Chat).filter(Chat.id == thread_id).first()
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check if user owns the chat
    if chat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")
    
    # Create timestamp for this conversation turn
    conversation_timestamp = datetime.now()

    user_message = Message(
        thread_id=thread_id, 
        role="user", 
        content=message, 
        timestamp=conversation_timestamp  # Add timestamp to user message
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    try:
        # Create session state with message history + new user input
        initial_state = session_service.create_session_state(
            thread_id=thread_id,
            current_input=message,
            db=db
        )

        result = chat_graph.invoke(
            initial_state,
            config={"recursion_limit": get_graph_recursion_limit()}
        )
        
        # DEBUG: Log the full graph result to see what keys are available
        logger.debug(f"🔍 Full graph result keys: {list(result.keys())}")
        logger.debug(f"🔍 Graph result used_docs: {result.get('used_docs', 'NOT_FOUND')}")
        logger.debug(f"🔍 Graph result used_image: {result.get('used_image', 'NOT_FOUND')}")

        # Extract and process results
        (
            assistant_message, image_data, routes, 
            is_rag_used, evaluation, text_doc_references, image_doc_references
        ) = extract_response_data(result)

        image_base64 = convert_image_to_base64(image_data)

        processing_time=int((time.time() - start_time) * 1000)  # in milliseconds

        # Update session cache with both messages
        session_service.update_cache_after_response(
            thread_id=thread_id,
            user_message=message,
            assistant_message=assistant_message
        )

        # Create assistant message with timestamp slightly after user message
        assistant_timestamp = datetime.now()

        # Convert domain-aware doc references to JSON strings for database storage
        logger.debug(f"📄 Text Doc References: {text_doc_references}")
        logger.debug(f"🖼️ Image Doc References: {image_doc_references}")
        text_docs_json = json.dumps(text_doc_references) if text_doc_references else None
        image_docs_json = json.dumps(image_doc_references) if image_doc_references else None

        assistant_reply = Message(
            thread_id=thread_id,
            role="assistant",
            content=assistant_message,
            image_url=image_base64,
            routes=routes,
            evaluation=evaluation,
            is_rag_used=is_rag_used,
            docs=text_docs_json,  # Store domain-aware text doc references
            image_docs=image_docs_json,  # Store domain-aware image doc references 
            timestamp=assistant_timestamp,
            processing_time=processing_time
        )
        db.add(assistant_reply)
        db.commit()
        db.refresh(assistant_reply)

        logger.debug(f"image doc references: {image_doc_references}")
        return MessageResponse(
            final_answer=assistant_message,
            image_url=image_base64,
            routes=result.get("routes", []),
            is_rag_used=is_rag_used,
            docs=text_doc_references,  # Send domain-aware doc references instead of just IDs
            image_docs=image_doc_references,  # Send domain-aware image doc references
            evaluation=evaluation,
            processing_time=processing_time,
            thread_id=request.thread_id,
            timestamp=assistant_timestamp.isoformat(),  # Convert to ISO format
        )
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        logger.error(f"❌ [REQ-{request_id}] Error in chat endpoint: {str(e)}")
        logger.error(f"💥 [REQ-{request_id}] Processing time before error: {processing_time}ms")
        logger.exception(f"🔍 [REQ-{request_id}] Full error traceback:")
        # Clear session cache on error to avoid corrupted state
        session_service.clear_session(thread_id)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/chat/messages", response_model=MessagesResponse)
async def get_chat_messages(
    request: MessagesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> MessagesResponse:
    thread_id = request.thread_id
    logger.info(f"💬 Retrieving Messages of Chat: {thread_id}")
    chat = db.query(Chat).filter(Chat.id == thread_id).first()
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check if user owns the chat
    if chat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")
    
    # Get messages sorted by timestamp (chronological order)
    sorted_messages = sorted(chat.messages, key=lambda msg: msg.timestamp or datetime.min)
    
    # Convert Message objects to MessageHistoryResponse objects
    message_responses = []
    for message in sorted_messages:
        # Parse routes from JSON string to list
        routes_list = []
        if message.routes:
            try:
                routes_list = json.loads(message.routes)
                if not isinstance(routes_list, list):
                    routes_list = []
            except (json.JSONDecodeError, TypeError):
                logger.warning(f"⚠️ Invalid routes JSON in message {message.id}: {message.routes}")
                routes_list = []
        
        # Parse text docs from JSON string to list
        text_docs_list = []
        if message.docs:
            try:
                text_docs_list = json.loads(message.docs)
                if not isinstance(text_docs_list, list):
                    text_docs_list = []
            except (json.JSONDecodeError, TypeError):
                logger.warning(f"⚠️ Invalid docs JSON in message {message.id}: {message.docs}")
                text_docs_list = []

        # Parse image docs from JSON string to list
        image_docs_list = []
        if hasattr(message, 'image_docs') and message.image_docs:
            try:
                image_docs_list = json.loads(message.image_docs)
                if not isinstance(image_docs_list, list):
                    image_docs_list = []
            except (json.JSONDecodeError, TypeError):
                logger.warning(f"⚠️ Invalid image_docs JSON in message {message.id}: {message.image_docs}")
                image_docs_list = []

        message_response = MessageHistoryResponse(
            final_answer=message.content,
            image_url=message.image_url,
            routes=routes_list,
            is_rag_used=message.is_rag_used,
            docs=text_docs_list,
            image_docs=image_docs_list,  
            evaluation=message.evaluation,
            processing_time=message.processing_time,
            thread_id=str(message.thread_id),
            role=message.role,
            timestamp=message.timestamp.isoformat() if message.timestamp else None,  # Add timestamp
        )
        message_responses.append(message_response)
    
    return MessagesResponse(messages=message_responses)


@router.post("/api/chat", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
def create_chat(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Chat:
    """Create a new chat session and return it."""
    chat = Chat(user_id=current_user.id, title="New Question")
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat

@router.get("/api/chats", response_model=ChatsResponse)
def list_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ChatsResponse:
    """Return all chat sessions belonging to the current user.

    Chats are ordered by creation time ascending. Each chat includes its ID,
    title (if set) and creation timestamp.
    """
    chats = db.query(Chat).filter(Chat.user_id == current_user.id).order_by(Chat.created_at).all()
    return ChatsResponse(chats=chats)

@router.patch("/api/chat/{thread_id}/title", response_model=ChatResponse)
def update_chat_title(
    thread_id: str,
    title_update: ChatTitleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Chat:
    """Update a chat title after the user's first message."""
    try:
        chat_id = int(thread_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chat ID format")

    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    if chat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this chat")

    normalized_title = title_update.title.strip()[:80]
    if not normalized_title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")

    chat.title = normalized_title
    db.commit()
    db.refresh(chat)
    return chat

@router.delete("/api/chat/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(
    thread_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    """Delete a chat session and its messages."""
    try:
        # Convert string to integer
        chat_id = int(thread_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chat ID format")
    
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check if user owns the chat
    if chat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this chat")
    
    # Clear session cache before deleting
    session_service = get_session_service()
    session_service.clear_session(thread_id)

    db.delete(chat)
    db.commit()
    logger.info(f"🗑️ Successfully deleted chat: {chat_id}")
    return None
