"""
Final Answer Node that combines text answer with image context
"""
from typing import Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.documents import Document

from app.utils.logging_config import get_logger
from ..base import BaseNode, State
from app.services.llm import llm_factory, LLMProvider
from ..config.domain_config_manager import get_domain_config_manager

class FinalAnswerNode(BaseNode):
    """Node that creates the final answer by combining text response with image context"""

    def __init__(self):
        super().__init__("final_answer_agent")
        # Get specific logger for this class
        self.logger = get_logger("nodes.chat_nodes.final_answer")
        self.config_manager = get_domain_config_manager()

        try:
            self.logger.info("✅ Final Answer initialized successfully with domain config")

        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Final Answer: {str(e)}")
            raise

    def execute(self, state: State) -> Dict[str, Any]:
        """Execute final answer logic by combining text answer with image context"""
        text_answer = state.get("text_answer", "")
        selected_image = state.get("selected_image")
        current_input = state["current_input"]
        
        improvement_feedback = state.get("improvement_feedback", None)
        final_answer = state.get("final_answer", None)
        include_image = state.get("include_image", False)

        # Get domain from state, fallback to data_science
        domains = state.get("domains", ["data_science"])
        primary_domain = domains[0] if domains else "data_science"
        
        # Get domain-specific configurations
        model_config = self.config_manager.get_model_config(primary_domain, "final_answer")

        self.logger.info(f"📝 Creating final answer for query: '{current_input}' using domain: '{primary_domain}'")
        self.logger.debug(f"📄 Text answer length: {len(text_answer)} characters")
        self.logger.debug(f"🖼️ Selected image: {'Available' if selected_image else 'None'}")

        # If no image was selected, return the text answer directly
        if selected_image is None:
            self.logger.info("📋 No image selected, returning text answer only")
            
            return self.no_image_selected(text_answer)
            
        elif improvement_feedback and state.get("is_approved", False) is False:
            self.logger.info("🔄 Refining answer with evaluator feedback")
            
            llm_messages = self.refine_answer_with_feedback(
                primary_domain, current_input, final_answer, improvement_feedback, 
                selected_image, include_image
            )

        else:
            self.logger.info("🔄 Refining answer with image context")
            llm_messages = self.refine_answer_with_image(primary_domain, text_answer, selected_image)

        # Use domain-specific model configuration
        answer_llm = llm_factory.get_model(
            LLMProvider[model_config.provider.upper()], 
            model_name=model_config.model_name,
        )

        try:
            # Call the LLM to refine the answer
            response = answer_llm.invoke(llm_messages)

            refined_answer = response.content.strip()

            self.logger.info("✅ Final answer created successfully with image context")
            self.logger.debug(f"📝 Refined answer length: {len(refined_answer)} characters")

            if state.get("test"):
                self.logger.debug("🔍 Test mode enabled - returning test response")
                return {
                    "final_answer": "I dunno what to say",
                    "selected_image": selected_image,
                    "messages": [response],
                    "test": False,
                }

            return {
                "final_answer": refined_answer,
                "selected_image": selected_image,
                "messages": [response]
            }

        except Exception as e:
            self.logger.error(f"❌ Error creating final answer: {str(e)}")
            # Fallback to original text answer if refinement fails
            self.logger.warning("⚠️ Falling back to original text answer")
            return {
                "final_answer": text_answer,
                "selected_image": selected_image,
            }
    
    def no_image_selected(self, text_answer: str) -> Dict[str, Any]:
        """Handle case where no image was selected"""
        return {
            "final_answer": text_answer,
            "selected_image": None,
            "messages": []
        }
    
    def refine_answer_with_image(self, domain: str, text_answer: str, selected_image: Document) -> Dict[str, Any]:
        """Refine the answer using the image context"""
        # Get domain-specific prompts
        prompt_config = self.config_manager.get_prompt_config(domain, "final_answer")
        
        # Use domain-specific prompts
        system_prompt = prompt_config.system_prompt
        user_prompt = prompt_config.user_prompt_template.format(
            text_answer=text_answer,
            image_summary=selected_image.page_content
        )
        
        self.logger.debug(f"🗨️ System message length: {len(system_prompt)} chars")
        self.logger.debug(f"👤 User message length: {len(user_prompt)} chars")
        
        llm_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        return llm_messages

    def refine_answer_with_feedback(
            self, domain: str, current_input, final_answer: str, feedback: str, 
            selected_image: Document , include_image: bool
        ) -> Dict[str, Any]:
        """Refine the answer using evaluator feedback"""
        # Get domain-specific prompts for feedback refinement
        prompt_config = self.config_manager.get_prompt_config(domain, "final_answer_with_feedback")
        
        # Use domain-specific prompts
        system_prompt = prompt_config.system_prompt
        user_prompt = prompt_config.user_prompt_template.format(
            current_input=current_input,
            final_answer=final_answer,
            feedback=feedback,
            image_integration_instruction='Integrates visual content appropriately' if selected_image and include_image else 'Focuses on text-only content',
            image_context_instruction='Use the provided image to enhance your explanation if it aligns with the content' if selected_image and include_image else 'No image integration needed - focus on clear text response'
        )
        
        self.logger.debug(f"🗨️ System message length: {len(system_prompt)} chars")
        self.logger.debug(f"👤 User message length: {len(user_prompt)} chars")

        if selected_image and include_image:
            user_message = HumanMessage(
                content=[
                    {
                        "type": "text", 
                        "text": user_prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{selected_image.metadata.get('base64_image')}"
                        }
                    }
                ]
            )
        else:
            # Text-only refinement (either no image or image should be removed)
            user_message = HumanMessage(content=user_prompt)

        llm_messages = [
            SystemMessage(content=system_prompt),
            user_message,
        ]

        return llm_messages

# Create final answer node instance
final_answer_agent = FinalAnswerNode()