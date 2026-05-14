from typing import List, Optional
from app.services.llm.factory.llm_factory import get_llm_factory, LLMProvider
from app.schemas.quiz_sch import QuizBase, QuizGenerateRequest
from langchain_core.messages import HumanMessage, SystemMessage
from app.utils.logging_config import get_logger

logger = get_logger("services.quiz_service")

class QuizService:
    def __init__(self):
        self.llm_factory = get_llm_factory()
        
    def generate_quiz(self, request: QuizGenerateRequest) -> QuizBase:
        """
        Generates a quiz using the same LLM configuration as the chat function.
        """
        logger.info(f"Generating quiz for topic: {request.topic}")
        
        system_prompt = (
            "You are an expert educator. Create a high-quality educational quiz based on the provided topic. "
            "The quiz should be challenging but fair. "
            "Ensure that for MCQ questions, the answer is a 0-based index of the options list. "
            "For short answer questions, provide a comma-separated list of key terms that should be present in the answer."
        )
        
        human_prompt = (
            f"Generate a quiz about: {request.topic}\n"
            f"Number of questions: {request.num_questions}\n"
            "Include a mix of multiple choice (mcq) and short answer (short) questions."
        )
        
        try:
            # Using the same LLM as the chat function (Gemini 2.5-flash)
            structured_llm = self.llm_factory.get_structured_model(
                provider=LLMProvider.GEMINI,
                schema_class=QuizBase,
                model_name="2.5-flash"
            )
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ]
            
            generated_quiz = structured_llm.invoke(messages)
            logger.info(f"Successfully generated quiz: {generated_quiz.title}")
            return generated_quiz
            
        except Exception as e:
            logger.error(f"Error generating quiz: {str(e)}")
            raise e

def get_quiz_service() -> QuizService:
    return QuizService()
