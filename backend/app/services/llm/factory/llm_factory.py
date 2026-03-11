"""
LLM Factory

Central factory for managing all LLM services with singleton pattern.
Provides unified interface for accessing different LLM providers.
"""

from typing import Dict, Optional, Any, List
from enum import Enum
from ..base.base_llm import BaseLLMService
from ..providers.gemini_service import get_gemini_service
from ..providers.openai_service import get_openai_service
from ..providers.embedding_service import get_embedding_service
from app.utils.logging_config import get_logger


class LLMProvider(Enum):
    """Supported LLM providers"""
    GEMINI = "gemini"
    OPENAI = "openai"


class LLMFactory:
    """Factory class for managing LLM services"""
    
    def __init__(self):
        self.logger = get_logger("llm_services.factory")
        self._services: Dict[LLMProvider, BaseLLMService] = {}
        self._embedding_service = None
        self._initialized = False
    
    def initialize(self) -> None:
        """Initialize all services"""
        if self._initialized:
            return
            
        self.logger.info("🏭 Initializing LLM Factory...")
        
        try:
            # Initialize services
            self._services[LLMProvider.GEMINI] = get_gemini_service()
            self._services[LLMProvider.OPENAI] = get_openai_service() 
            self._embedding_service = get_embedding_service()
            
            self._initialized = True
            self.logger.info("✅ LLM Factory initialized successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize LLM Factory: {str(e)}")
            raise
    
    def get_service(self, provider: LLMProvider) -> BaseLLMService:
        """Get LLM service by provider"""
        if not self._initialized:
            self.initialize()
            
        if provider not in self._services:
            available = list(self._services.keys())
            raise ValueError(f"Provider '{provider}' not available. Available: {available}")
            
        return self._services[provider]
    
    def get_gemini_service(self) -> BaseLLMService:
        """Get Gemini service (convenience method)"""
        return self.get_service(LLMProvider.GEMINI)
    
    def get_openai_service(self) -> BaseLLMService:
        """Get OpenAI service (convenience method)"""  
        return self.get_service(LLMProvider.OPENAI)
    
    def get_embedding_service(self):
        """Get embedding service"""
        if not self._initialized:
            self.initialize()
        return self._embedding_service
    
    def get_model(self, provider: LLMProvider, model_name: Optional[str] = None):
        """Get specific model from provider"""
        service = self.get_service(provider)
        return service.get_model(model_name)
    
    def get_structured_model(self, provider: LLMProvider, schema_class: Any, 
                           model_name: Optional[str] = None, **kwargs):
        """Get structured model from provider"""
        service = self.get_service(provider)
        return service.get_structured_model(schema_class, model_name, **kwargs)
    
    def list_available_models(self) -> Dict[str, List[str]]:
        """Get all available models by provider"""
        if not self._initialized:
            self.initialize()
            
        models = {}
        for provider, service in self._services.items():
            models[provider.value] = service.get_available_models()
        return models
    
    def is_initialized(self) -> bool:
        """Check if factory is initialized"""
        return self._initialized


# Singleton factory instance
_factory_instance = None

def get_llm_factory() -> LLMFactory:
    """Get singleton LLM factory instance"""
    global _factory_instance
    if _factory_instance is None:
        _factory_instance = LLMFactory()
        _factory_instance.initialize()
    return _factory_instance