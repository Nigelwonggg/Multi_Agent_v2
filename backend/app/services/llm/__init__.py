"""
LLM Services Module

Provides centralized LLM management with singleton pattern for efficient resource usage.
Includes factory pattern for easy instantiation and model switching.
"""

from .base import BaseLLMService
from .providers import (
    GeminiService, 
    get_gemini_service,
    OpenAIService,
    get_openai_service,
    EmbeddingService,
    get_embedding_service
)
from .factory import LLMFactory, get_llm_factory, LLMProvider

__all__ = [
    'BaseLLMService',
    'LLMFactory',
    'get_llm_factory',
    'LLMProvider',
    'GeminiService',
    'get_gemini_service',
    'OpenAIService',
    'get_openai_service',
    'EmbeddingService',
    'get_embedding_service'
]

# Initialize singleton LLM factory instance for convenience
llm_factory = get_llm_factory()