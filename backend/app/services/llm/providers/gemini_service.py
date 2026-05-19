"""
Gemini LLM Service

Provides access to different Gemini model variants through OpenAI-compatible API.
Uses singleton pattern for efficient resource management.
"""
import sys
import os
from dotenv import load_dotenv
from typing import List
from langchain_openai import ChatOpenAI
from ..base.base_llm import BaseLLMService

from app.utils.logging_config import get_logger
logger = get_logger("services.llm.gemini_service")
load_dotenv(override=True)
API_KEY=os.environ.get("GEMINI_API_KEY")
logger.debug(f"Loaded GEMINI_API_KEY from environment: {'present' if API_KEY else 'missing'}")

class GeminiService(BaseLLMService):
    """Service for Google Gemini models"""
    
    def __init__(self):
        super().__init__("gemini")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        self.api_key = API_KEY

        logger.debug(f"Loaded GOOGLE_API_KEY from environment: {'present' if self.api_key else 'missing'}")
        
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required for Gemini service")
    
    def _initialize_models(self) -> None:
        """Initialize all Gemini model variants"""
        model_configs = {
            "2.0-flash": "gemini-2.0-flash",
            "flash-thinking": "gemini-2.0-flash-thinking-exp",
            "2.5-flash": "gemini-2.5-flash",
            "2.5-pro": "gemini-2.5-pro", 
            "pro-exp": "gemini-exp-1206",
            "flash-8b": "gemini-1.5-flash-8b"
        }
        
        for model_key, model_name in model_configs.items():
            try:
                self._models[model_key] = ChatOpenAI(
                    base_url=self.base_url,
                    api_key=self.api_key,
                    model=model_name,
                )
                self.logger.debug(f"✅ Initialized Gemini model '{model_key}' ({model_name})")
            except Exception as e:
                self.logger.error(f"❌ Failed to initialize Gemini model '{model_key}': {str(e)}")
                raise
    
    def get_available_models(self) -> List[str]:
        """Get list of available Gemini model variants"""
        return ["flash", "flash-thinking", "pro", "pro-exp", "flash-8b"]


# Singleton instance
_gemini_instance = None

def get_gemini_service() -> GeminiService:
    """Get singleton Gemini service instance"""
    global _gemini_instance
    if _gemini_instance is None:
        _gemini_instance = GeminiService()
    return _gemini_instance
