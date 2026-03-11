"""
Base LLM Service

Abstract base class for all LLM service implementations.
Provides common interface and functionality.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from langchain_core.messages import BaseMessage
from langchain_core.language_models import BaseChatModel
from app.utils.logging_config import get_logger


class BaseLLMService(ABC):
    """Abstract base class for LLM services"""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = get_logger(f"llm_services.{service_name}")
        self._models: Dict[str, BaseChatModel] = {}
        self._initialized = False
        
    @abstractmethod
    def _initialize_models(self) -> None:
        """Initialize all model variants for this service"""
        pass
    
    @abstractmethod
    def get_available_models(self) -> List[str]:
        """Get list of available model names"""
        pass
    
    def initialize(self) -> None:
        """Initialize the service if not already done"""
        if not self._initialized:
            self.logger.info(f"🚀 Initializing {self.service_name} service...")
            self._initialize_models()
            self._initialized = True
            self.logger.info(f"✅ {self.service_name} service initialized with models: {list(self._models.keys())}")
    
    def get_model(self, model_name: Optional[str] = None) -> BaseChatModel:
        """Get a specific model instance"""
        if not self._initialized:
            self.initialize()
            
        if model_name is None:
            # Return the first available model as default
            model_name = next(iter(self._models.keys()))
            
        if model_name not in self._models:
            available = list(self._models.keys())
            raise ValueError(f"Model '{model_name}' not found. Available models: {available}")
            
        return self._models[model_name]
    
    def get_structured_model(self, schema_class: Any, model_name: Optional[str] = None, **kwargs) -> BaseChatModel:
        """Get a model with structured output"""
        model = self.get_model(model_name)
        return model.with_structured_output(schema_class, **kwargs)
    
    def invoke(self, messages: List[BaseMessage], model_name: Optional[str] = None, **kwargs) -> Any:
        """Invoke the model with messages"""
        model = self.get_model(model_name)
        return model.invoke(messages, **kwargs)
    
    def is_initialized(self) -> bool:
        """Check if service is initialized"""
        return self._initialized