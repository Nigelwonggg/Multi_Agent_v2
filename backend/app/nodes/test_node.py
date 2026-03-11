import sys
import os
import textwrap
from dotenv import load_dotenv

from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from app.utils.logging_config import get_logger

from .chat_nodes import BaseNode, State

load_dotenv(override=True)
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
API_KEY = os.environ.get("GOOGLE_API_KEY")
MODEL = "gemini-2.0-flash"

class TestNode(BaseNode):
    """ Node to test direct answer functionality using Gemini LLM """
    def __init__(self):
        super().__init__("test_node")
        # Get specific logger for this class
        self.logger = get_logger("nodes.test_node")

        # Initialize LLM - get these from environment variables
        self.base_url = BASE_URL
        self.api_key = API_KEY
        self.model_name = MODEL

        if not self.api_key:
            self.logger.error("❌ API_KEY environment variable is required")
            raise ValueError("API_KEY environment variable is required")

        self.logger.info(f"🤖 Using model: {self.model_name}")

        try:
            # Initialize LLM
            self.answer_llm = ChatOpenAI(
                base_url=self.base_url,
                api_key=self.api_key,
                model=self.model_name,
            )

            self.logger.info("✅ Direct Answer LLM initialized successfully")

        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Direct Answer LLM: {str(e)}")
            raise
    
    # def __call__(self, state: State) -> Dict[str, Any]:
    #     """Make the node callable for LangGraph"""
    #     return self.execute(state)
    
    def execute(self, state: State) -> Dict[str, Any]:
        """Execute direct answer logic using LLM"""
        
        messages = state["messages"]
        current_input = state["current_input"]

        self.logger.info(f"💬 Processing direct query: '{current_input}'")
        self.logger.debug(f"📝 Messages to process: {messages}")

        # Prepare system message for direct answering
        system_prompt = textwrap.dedent("""\
            You are a helpful AI assistant.
            Provide direct, accurate, and helpful answers to user questions based on your knowledge. 
            """)

        user_prompt = textwrap.dedent(f"""\
            Chat_history: {messages}                            
            Answer the following question directly without any additional context or RAG:
            {current_input}
            """)

        # Prepare messages for LLM
        llm_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        self.logger.debug(f"🗨️ System message length: {len(system_prompt)} chars")
        self.logger.debug(f"👤 User message length: {len(user_prompt)} chars")

        try:
            # Call LLM
            self.logger.debug("🔍 Calling LLM for direct answer...")
            response = self.answer_llm.invoke(llm_messages)

            # Extract answer
            answer = response.content.strip()

            self.logger.info("✨ Direct response generated successfully")
            self.logger.debug(f"📝 Response length: {len(answer)} characters")
            self.logger.debug(f"📄 Response preview: {answer[:100]}...")

            return {
                "final_answer": answer,
                "messages": [response],
            }

        except Exception as e:
            self.logger.error(f"💥 Error in direct answer LLM call: {str(e)}")
            self.logger.exception("🔍 Full LLM error traceback:")

            # Fallback response
            fallback_answer = f"I apologize, but I encountered an error while processing your question: '{user_prompt}'. Please try again."

            self.logger.warning("🔄 Using fallback response due to LLM error")
            return {"final_answer": fallback_answer, "messages": []}
        
test_node = TestNode()