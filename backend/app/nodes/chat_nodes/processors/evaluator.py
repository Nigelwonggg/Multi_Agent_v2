"""
Evaluator Node for evaluating the final answer.
"""
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage
from app.utils.logging_config import get_logger

from ..base import BaseNode, State
from app.services.llm import llm_factory, LLMProvider
from ..config.domain_config_manager import get_domain_config_manager
from ..config.direct_answer_config_manager import get_direct_answer_config_manager

class DomainEvaluatorOutput(BaseModel):
    accuracy_score: int = Field(ge=1, le=5, description="Accuracy rating 1-5")
    relevance_score: int = Field(ge=1, le=5, description="Relevance rating 1-5")
    educational_value_score: int = Field(ge=1, le=5, description="Educational value rating 1-5")
    safety_score: int = Field(ge=1, le=5, description="Safety rating 1-5")
    overall_score: float = Field(ge=1.0, le=5.0, description="Average score")
    is_approved: bool = Field(description="True if approved for user")
    evaluation_justification: str = Field(description="Detailed reasoning for scores")
    improvement_feedback: str = Field(description="Specific suggestions or 'None'")
    include_image: bool = Field(default=False, description="Whether to include image in evaluation")

class GeneralEvaluatorOutput(BaseModel):
    accuracy_score: int = Field(ge=1, le=5, description="Accuracy rating 1-5")
    relevance_score: int = Field(ge=1, le=5, description="Relevance rating 1-5")
    clarity_helpfulness_score: int = Field(ge=1, le=5, description="Clarity and helpfulness rating 1-5")
    safety_appropriateness_score: int = Field(ge=1, le=5, description="Safety and appropriateness rating 1-5")
    overall_score: float = Field(ge=1.0, le=5.0, description="Average score")
    is_approved: bool = Field(description="True if approved for user")
    evaluation_justification: str = Field(description="Detailed reasoning for scores")
    improvement_feedback: str = Field(description="Specific suggestions or 'None'")

class EvaluatorNode(BaseNode):
    """Evaluator node that evaluates the final answer"""
    
    def __init__(self):
        super().__init__("chat_evaluator_agent")
        
        # Get logger for this specific class
        self.logger = get_logger("nodes.chat_nodes.evaluator")
        self.domain_config_manager = get_domain_config_manager()
        self.direct_answer_config_manager = get_direct_answer_config_manager()
        
        try:
            self.logger.info("✅ Evaluator initialized successfully with dual config support")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Evaluator: {str(e)}")
            raise

    def execute(self, state: State) -> Dict[str, Any]:
        """
        Execute evaluator logic
        """
        messages = state["messages"]
        current_input = state["current_input"]
        final_answer = state["final_answer"]
        selected_image = state.get("selected_image", None)
        
        # Detect if this is a direct answer (no domain specified or no RAG needed)
        is_rag_needed = state.get("is_rag_needed", True)
        domains = state.get("domains", [])
        
        # Use general config for direct answers, domain-specific for RAG answers
        if not is_rag_needed or not domains:
            # Direct answer - use general config
            model_config = self.direct_answer_config_manager.get_model_config("evaluator")
            prompt_config = self.direct_answer_config_manager.get_prompt_config("evaluator")
            self.logger.info("🔍 Evaluating direct answer using general config")
        else:
            # RAG answer - use domain-specific config
            primary_domain = domains[0] if domains else "data_science"
            model_config = self.domain_config_manager.get_model_config(primary_domain, "evaluator")
            prompt_config = self.domain_config_manager.get_prompt_config(primary_domain, "evaluator")
            self.logger.info(f"🔍 Evaluating RAG response for domain: '{primary_domain}'")

        # Use appropriate prompts (general for direct answers, domain-specific for RAG)
        system_prompt = prompt_config.system_prompt
        user_prompt = prompt_config.user_prompt_template.format(
            message_count=len(messages),
            recent_messages=messages[-3:] if len(messages) > 3 else messages,
            current_input=current_input,
            final_answer=final_answer,
            image_status="is" if selected_image else "is NOT",
            image_instruction="Assess if the image enhances the final answer or should be removed" if selected_image else "Focus on text-only evaluation"
        )

        if selected_image:
            # Add this to user_prompt when image is present
            self.logger.debug("🖼️ Image context is available for evaluation")
            user_message = HumanMessage(
                content=[
                    {
                        "type": "text",
                        "text": user_prompt,
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{selected_image.metadata.get('base64_image')}"
                        },
                    },
                ]
            )
        else:
            user_message = HumanMessage(
                content=user_prompt
            )

        # Prepare messages for LLM
        llm_messages = [
            SystemMessage(content=system_prompt),
            user_message,
        ]

        # Use appropriate model configuration and output schema
        if not is_rag_needed or not domains:
            # Direct answer - use general evaluator output schema
            output_schema = GeneralEvaluatorOutput
        else:
            # RAG answer - use domain-specific evaluator output schema
            output_schema = DomainEvaluatorOutput
            
        evaluator_llm_with_output = llm_factory.get_structured_model(
            LLMProvider[model_config.provider.upper()], 
            output_schema,
            model_name=model_config.model_name,
            method="json_schema", 
            strict=True
        )

        # Call LLM with structured output
        try:
            response = evaluator_llm_with_output.invoke(llm_messages)
            
            self.logger.info("✅ Evaluation completed successfully")

            return {
                "final_answer": final_answer,
                "selected_image": selected_image,
                "is_approved": response.is_approved,
                "evaluation": response.evaluation_justification,
                "improvement_feedback": response.improvement_feedback,
                "include_image": getattr(response, 'include_image', False),
            }
        except Exception as e:
            self.logger.error(f"❌ Failed to evaluate: {str(e)}")
            return {
                "final_answer": final_answer,
                "selected_image": selected_image,
                "is_approved": True,
                "evaluation": f"Evaluation skipped after error: {str(e)}",
                "improvement_feedback": "None",
                "include_image": bool(selected_image),
            }

# Create an instance of the EvaluatorNode
evaluator = EvaluatorNode()
