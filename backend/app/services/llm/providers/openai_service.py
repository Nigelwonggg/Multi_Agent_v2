"""
OpenAI LLM Service

Provides access to different OpenAI model variants.
Uses singleton pattern for efficient resource management.
"""

import os
from typing import List
from langchain_openai import ChatOpenAI
from ..base.base_llm import BaseLLMService


class OpenAIService(BaseLLMService):
    """Service for OpenAI models"""
    
    def __init__(self):
        super().__init__("openai")
        self.api_key = os.environ.get("OPENAI_API_KEY")
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required for OpenAI service")
    
    def _initialize_models(self) -> None:
        """Initialize all OpenAI model variants"""
        model_configs = {
            # "gpt-4o": "gpt-4o",
            "gpt-4o-mini": "gpt-4o-mini", 
            # "gpt-4-turbo": "gpt-4-turbo",
            # "gpt-4": "gpt-4",
            # "gpt-3.5-turbo": "gpt-3.5-turbo"
        }
        
        for model_key, model_name in model_configs.items():
            try:
                self._models[model_key] = ChatOpenAI(
                    api_key=self.api_key,
                    model=model_name,
                )
                self.logger.debug(f"✅ Initialized OpenAI model '{model_key}' ({model_name})")
            except Exception as e:
                self.logger.error(f"❌ Failed to initialize OpenAI model '{model_key}': {str(e)}")
                raise
    
    def get_available_models(self) -> List[str]:
        """Get list of available OpenAI model variants"""
        return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]


# Singleton instance
_openai_instance = None

def get_openai_service() -> OpenAIService:
    """Get singleton OpenAI service instance"""
    global _openai_instance
    if _openai_instance is None:
        _openai_instance = OpenAIService()
        _openai_instance.initialize()
    return _openai_instance