"""
Text Store Factory

Factory pattern for managing text store services across different domains.
Provides centralized access and singleton management.
"""

from typing import Dict, Optional
from enum import Enum
from ..base.text_store_base import BaseTextStoreService
from ..domains.ds_text_store import DataScienceTextStore
from ..domains.med_text_store import MedicalTextStore
from app.utils.logging_config import get_logger


class TextStoreDomain(Enum):
    """Supported text store domains"""
    DATA_SCIENCE = "data_science"
    MEDICAL = "medical"


class TextStoreFactory:
    """Factory class for managing text store services"""
    
    def __init__(self):
        self.logger = get_logger("services.text_store_factory")
        self._stores: Dict[TextStoreDomain, BaseTextStoreService] = {}
        self._initialized = False
        self._store_classes = {
            TextStoreDomain.DATA_SCIENCE: DataScienceTextStore,
            TextStoreDomain.MEDICAL: MedicalTextStore,
        }
    
    def initialize(self) -> None:
        """Initialize all text store services"""
        if self._initialized:
            return
            
        self.logger.info("🏭 Initializing Text Store Factory...")
        
        try:
            for domain, store_class in self._store_classes.items():
                if domain not in self._stores:
                    self._stores[domain] = store_class()
            
            self._initialized = True
            self.logger.info("✅ Text Store Factory initialized successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Text Store Factory: {str(e)}")
            raise
    
    def get_store(self, domain: TextStoreDomain) -> BaseTextStoreService:
        """Get text store service by domain"""
        if domain not in self._store_classes:
            available = list(self._store_classes.keys())
            raise ValueError(f"Domain '{domain}' not available. Available: {available}")

        if domain not in self._stores:
            self.logger.info(f"Lazy loading text store for domain: {domain.value}")
            self._stores[domain] = self._store_classes[domain]()
            self._initialized = len(self._stores) == len(self._store_classes)
            
        return self._stores[domain]
    
    def get_data_science_store(self) -> DataScienceTextStore:
        """Get Data Science text store (convenience method)"""
        return self.get_store(TextStoreDomain.DATA_SCIENCE)
    
    def get_medical_store(self) -> MedicalTextStore:
        """Get Medical text store (convenience method)"""
        return self.get_store(TextStoreDomain.MEDICAL)
    
    def list_available_domains(self) -> Dict[str, str]:
        """Get all available domains"""
        return {domain.value: domain.name for domain in self._store_classes.keys()}
    
    def is_initialized(self) -> bool:
        """Check if factory is initialized"""
        return self._initialized
    
    def get_store_by_name(self, domain_name: str) -> BaseTextStoreService:
        """Get store by domain name string"""
        try:
            domain = TextStoreDomain(domain_name.lower())
            return self.get_store(domain)
        except ValueError:
            available = [d.value for d in TextStoreDomain]
            raise ValueError(f"Invalid domain name '{domain_name}'. Available: {available}")


# Singleton factory instance
_text_store_factory_instance = None

def get_text_store_factory() -> TextStoreFactory:
    """Get singleton text store factory instance"""
    global _text_store_factory_instance
    if _text_store_factory_instance is None:
        _text_store_factory_instance = TextStoreFactory()
    return _text_store_factory_instance
