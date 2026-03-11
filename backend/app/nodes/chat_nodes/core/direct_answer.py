"""
Direct answer node using LLM
"""
from typing import Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from app.utils.logging_config import get_logger
from ..base import BaseNode, State
from app.services.llm import llm_factory, LLMProvider
from ..config.direct_answer_config_manager import get_direct_answer_config_manager


class DirectAnswerNode(BaseNode):
    """Node that provides direct answers using LLM without RAG"""

    def __init__(self):
        super().__init__("direct_answer_agent")
        # Get specific logger for this class
        self.logger = get_logger("nodes.chat_nodes.direct_answer")
        self.config_manager = get_direct_answer_config_manager()

        try:
            self.logger.info("✅ Direct Answer initialized successfully with general config")

        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Direct Answer: {str(e)}")
            raise
    
    def execute(self, state: State) -> Dict[str, Any]:
        """Execute direct answer logic using LLM"""
        
        messages = state["messages"]
        current_input = state["current_input"]
        
        # Get general configurations (domain-independent)
        model_config = self.config_manager.get_model_config("direct_answer")
        prompt_config = self.config_manager.get_prompt_config("direct_answer")

        self.logger.info(f"💬 Processing direct query: '{current_input}' using general config")
        self.logger.debug(f"📝 Messages to process: {messages}")

        # Use general prompts
        system_prompt = prompt_config.system_prompt
        user_prompt = prompt_config.user_prompt_template.format(
            messages=messages,
            current_input=current_input
        )

        # Prepare messages for LLM
        llm_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        self.logger.debug(f"🗨️ System message length: {len(system_prompt)} chars")
        self.logger.debug(f"👤 User message length: {len(user_prompt)} chars")

        # Use general model configuration
        answer_llm = llm_factory.get_model(
            LLMProvider[model_config.provider.upper()], 
            model_name=model_config.model_name
        )

        try:
            # Call LLM
            self.logger.debug("🔍 Calling LLM for direct answer...")
            response = answer_llm.invoke(llm_messages)

            # Extract answer
            answer = response.content.strip()

            self.logger.info("✨ Direct response generated successfully")
            self.logger.debug(f"📄 Response preview: {answer[:50]}...")

            return {
                "final_answer": answer,
            }

        except Exception as e:
            self.logger.error(f"💥 Error in direct answer LLM call: {str(e)}")
            self.logger.exception("🔍 Full LLM error traceback:")

            # Fallback response
            fallback_answer = f"I apologize, but I encountered an error while processing your question: '{current_input}'. Please try again."

            self.logger.warning("🔄 Using fallback response due to LLM error")
            return {"final_answer": fallback_answer, "messages": []}

    def execute_with_feedback(self, state: State) -> Dict[str, Any]:
        """Execute direct answer refinement with feedback"""
        
        current_input = state["current_input"]
        final_answer = state["final_answer"]
        feedback = state.get("feedback", "")
        
        # Get configuration for feedback refinement
        model_config = self.config_manager.get_model_config("direct_answer")
        prompt_config = self.config_manager.get_prompt_config("direct_answer_with_feedback")

        self.logger.info(f"🔄 Refining direct answer based on feedback for query: '{current_input}'")
        self.logger.debug(f"📝 Feedback received: {feedback}")

        # Use feedback refinement prompts
        system_prompt = prompt_config.system_prompt
        user_prompt = prompt_config.user_prompt_template.format(
            current_input=current_input,
            final_answer=final_answer,
            feedback=feedback
        )

        # Prepare messages for LLM
        llm_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        self.logger.debug(f"🗨️ System message length: {len(system_prompt)} chars")
        self.logger.debug(f"👤 User message length: {len(user_prompt)} chars")

        # Use general model configuration
        answer_llm = llm_factory.get_model(
            LLMProvider[model_config.provider.upper()], 
            model_name=model_config.model_name
        )

        try:
            # Call LLM for refinement
            self.logger.debug("🔍 Calling LLM for answer refinement...")
            response = answer_llm.invoke(llm_messages)

            # Extract refined answer
            refined_answer = response.content.strip()

            self.logger.info("✨ Direct answer refined successfully")
            self.logger.debug(f"📄 Refined response preview: {refined_answer[:50]}...")

            return {
                "final_answer": refined_answer,
            }

        except Exception as e:
            self.logger.error(f"💥 Error in direct answer refinement LLM call: {str(e)}")
            self.logger.exception("🔍 Full LLM error traceback:")

            # Return original answer if refinement fails
            self.logger.warning("🔄 Using original answer due to refinement error")
            return {"final_answer": final_answer}


# Create direct answer instance
direct_answer = DirectAnswerNode()