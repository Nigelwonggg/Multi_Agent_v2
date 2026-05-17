"""
Base node class for LangGraph nodes
"""

import sys
import os

from abc import ABC, abstractmethod
from typing import Dict, Any, Annotated, List, Optional, TypedDict
from app.utils.logging_config import get_logger

from langchain_core.documents import Document
from langgraph.graph.message import add_messages

class State(TypedDict):
    messages: Annotated[List[Any], add_messages]  # automatic messages appending
    current_input: str
    is_rag_needed: bool
    domains: List[str]  # List of domains relevant to the query
    text_answer: str
    final_answer: str
    is_approved: bool
    evaluation: str
    improvement_feedback: str
    docs: list[str]
    used_docs: list[dict]  # Domain-aware document references from RAG
    selected_image: Optional[Document]
    used_image: Optional[dict]  # Domain-aware image reference from RAG
    include_image: bool  # Whether to include images in the final answer
    thread_id: Optional[str]  # Thread ID for multi-threaded conversations
    force_rag: bool  # Whether the request explicitly wants retrieval
    search_all_domains: bool  # Whether RAG should search every available domain
    requested_domains: List[str]  # Domains explicitly requested by the caller
    routes: List[str]  # List to track the routes taken during the process
    test: bool  # Flag to indicate if the node is in test mode


class BaseNode(ABC):
    """Base class for all LangGraph nodes"""

    def __init__(self, node_name: str):
        self.node_name = node_name
        # Create logger with the full module path for better tracking
        self.logger = get_logger(f"nodes.{node_name}")
        self.logger.info(f"🏗️ Initializing {node_name} node")

    @abstractmethod
    def execute(self, state: State) -> Dict[str, Any]:
        """Execute the node logic"""
        pass

    def __call__(self, state: State) -> Dict[str, Any]:
        """Make the node callable"""
        self.logger.info(f"🔄 Executing {self.node_name}")
        self.logger.debug(f"📥 Input state keys: {list(state.keys())}")

        # Append the current routes to the routes list
        if 'routes' in state:
            state['routes'].append(self.node_name)

        try:
            result = self.execute(state)
            self.logger.info(f"✅ {self.node_name} completed successfully")
            self.logger.debug(f"📤 Output keys: {list(result.keys())}")

            # Update state with result
            updated_state = {**state, **result}
            return updated_state

        except Exception as e:
            self.logger.error(f"❌ Error in {self.node_name}: {str(e)}")
            self.logger.exception("🔍 Full error traceback:")
            raise
