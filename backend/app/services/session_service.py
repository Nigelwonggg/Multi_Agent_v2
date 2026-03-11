from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage, AIMessage
from datetime import datetime

from app.models.chat_db_model import Chat, Message
from app.utils.logging_config import get_logger

logger = get_logger("services.session_service")


class SessionService:
    """Service to manage chat sessions and message history caching"""
    
    def __init__(self):
        # Cache to store message history: {thread_id: messages}
        self._message_cache: Dict[str, List[Any]] = {}
        self._last_accessed: Dict[str, datetime] = {}
        
    def get_session_messages(self, thread_id: str, db: Session) -> List[Any]:
        """
        Get message history from cache or load from database if not cached.
        
        Args:
            thread_id: The chat thread ID
            db: Database session
            
        Returns:
            List of LangChain messages (HumanMessage, AIMessage)
        """
        thread_id_str = str(thread_id)
        
        # Check if messages are already cached
        if thread_id_str in self._message_cache:
            logger.debug(f"📦 Using cached messages for thread: {thread_id_str}")
            self._last_accessed[thread_id_str] = datetime.now()
            return self._message_cache[thread_id_str].copy()
        
        # Load from database
        logger.info(f"🔄 Loading messages from database for thread: {thread_id_str}")
        messages = self._load_messages_from_db(thread_id_str, db)
        
        # Cache the messages
        self._message_cache[thread_id_str] = messages.copy()
        self._last_accessed[thread_id_str] = datetime.now()
        
        logger.info(f"✅ Messages loaded and cached for thread: {thread_id_str} ({len(messages)} messages)")
        return messages.copy()
    
    def add_user_message(self, thread_id: str, content: str) -> None:
        """
        Add a new user message to the cached session.
        
        Args:
            thread_id: The chat thread ID
            content: The user message content
        """
        thread_id_str = str(thread_id)
        
        if thread_id_str in self._message_cache:
            self._message_cache[thread_id_str].append(HumanMessage(content=content))
            self._last_accessed[thread_id_str] = datetime.now()
            logger.debug(f"➕ Added user message to cached session: {thread_id_str}")
    
    def add_assistant_message(self, thread_id: str, content: str) -> None:
        """
        Add a new assistant message to the cached session.
        
        Args:
            thread_id: The chat thread ID
            content: The assistant message content
        """
        thread_id_str = str(thread_id)
        
        if thread_id_str in self._message_cache:
            self._message_cache[thread_id_str].append(AIMessage(content=content))
            self._last_accessed[thread_id_str] = datetime.now()
            logger.debug(f"➕ Added assistant message to cached session: {thread_id_str}")
    
    def create_session_state(self, thread_id: str, current_input: str, db: Session) -> Dict[str, Any]:
        """
        Create a fresh session state with loaded message history and new user input.
        
        Args:
            thread_id: The chat thread ID
            current_input: The new user message
            db: Database session
            
        Returns:
            Fresh session state with history + new input
        """
        # Get cached or load message history
        history_messages = self.get_session_messages(thread_id, db)
        
        # Add the new user message to the session (but not to cache yet)
        session_messages = history_messages + [HumanMessage(content=current_input)]
        
        # Create fresh state with message history
        return {
            "messages": session_messages,
            "current_input": current_input,
            "thread_id": thread_id,
            "routes": [],
            "text_answer": "",
            "final_answer": "",
            "is_rag_needed": False,
            "domains": [],
            "evaluation": "",
            "test": False,
            "include_image": False,
            "is_approved": False,
            "improvement_feedback": "",
            "docs": [],
            "used_docs": [],  # Initialize domain-aware document references
            "selected_image": None,
            "used_image": None,  # Initialize domain-aware image reference
        }
    
    def update_cache_after_response(self, thread_id: str, user_message: str, assistant_message: str) -> None:
        """
        Update the message cache with both user and assistant messages after successful processing.
        
        Args:
            thread_id: The chat thread ID
            user_message: The user message content
            assistant_message: The assistant response content
        """
        self.add_user_message(thread_id, user_message)
        self.add_assistant_message(thread_id, assistant_message)
    
    def clear_session(self, thread_id: str) -> None:
        """
        Clear a specific session from cache.
        
        Args:
            thread_id: The chat thread ID to clear
        """
        thread_id_str = str(thread_id)
        
        if thread_id_str in self._message_cache:
            del self._message_cache[thread_id_str]
            del self._last_accessed[thread_id_str]
            logger.info(f"🗑️ Cleared message cache for thread: {thread_id_str}")
    
    def clear_all_sessions(self) -> None:
        """Clear all cached sessions"""
        session_count = len(self._message_cache)
        self._message_cache.clear()
        self._last_accessed.clear()
        logger.info(f"🗑️ Cleared all {session_count} cached message sessions")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get statistics about the cache"""
        return {
            "cached_sessions": len(self._message_cache),
            "sessions": list(self._message_cache.keys()),
            "message_counts": {
                thread_id: len(messages) 
                for thread_id, messages in self._message_cache.items()
            },
            "last_accessed": {
                thread_id: accessed.isoformat() 
                for thread_id, accessed in self._last_accessed.items()
            }
        }
    
    def _load_messages_from_db(self, thread_id: str, db: Session) -> List[Any]:
        """
        Load message history from database and convert to LangChain format.
        
        Args:
            thread_id: The chat thread ID
            db: Database session
            
        Returns:
            List of LangChain messages
        """
        try:
            # Get all messages for this chat, ordered by timestamp
            messages = db.query(Message).filter(
                Message.thread_id == int(thread_id)
            ).order_by(Message.timestamp).all()
            
            logger.debug(f"📚 Loaded {len(messages)} messages from DB for thread: {thread_id}")
            
            # Convert to LangChain format
            langchain_messages = []
            
            for msg in messages:
                if msg.role == "user":
                    langchain_messages.append(HumanMessage(content=msg.content))
                elif msg.role == "assistant":
                    langchain_messages.append(AIMessage(content=msg.content))
            
            return langchain_messages
            
        except Exception as e:
            logger.error(f"❌ Error loading messages from database: {str(e)}")
            logger.exception("🔍 Full error traceback:")
            return []


# Global session service instance
session_service = SessionService()


def get_session_service() -> SessionService:
    """Get the global session service instance"""
    return session_service