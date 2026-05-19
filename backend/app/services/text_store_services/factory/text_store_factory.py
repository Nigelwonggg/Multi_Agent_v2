"""
Text Store Factory

Factory pattern for managing text store services across different domains.
Provides centralized access and singleton management.
"""

from typing import Dict, Optional, Union
from enum import Enum
from ..base.text_store_base import BaseTextStoreService
from ..domains.ds_text_store import DataScienceTextStore
from ..domains.med_text_store import MedicalTextStore
from ..domains.generic_text_store import GenericTextStore
from app.utils.logging_config import get_logger


class TextStoreDomain(Enum):
    """Supported text store domains"""
    DATA_SCIENCE = "data_science"
    MEDICAL = "medical"


class TextStoreFactory:
    """Factory class for managing text store services"""
    
    def __init__(self):
        self.logger = get_logger("services.text_store_factory")
        self._stores: Dict[str, BaseTextStoreService] = {}
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
            # Initialize domain-specific stores
            self._stores[TextStoreDomain.DATA_SCIENCE.value] = DataScienceTextStore()
            self._stores[TextStoreDomain.MEDICAL.value] = MedicalTextStore()
            
            self._initialized = True
            self.logger.info("✅ Text Store Factory initialized successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Text Store Factory: {str(e)}")
            raise
    
    def get_store(self, domain: Union[TextStoreDomain, str]) -> BaseTextStoreService:
        """Get text store service by domain"""
        if not self._initialized:
            self.initialize()
            
        domain_name = domain.value if isinstance(domain, TextStoreDomain) else domain.lower()
            
        if domain_name not in self._stores:
            self.logger.info(f"🔍 Domain '{domain_name}' not found in active stores. Creating GenericTextStore...")
            try:
                # Dynamically create a generic store for the new domain
                self._stores[domain_name] = GenericTextStore(domain_name)
            except Exception as e:
                import traceback
                error_traceback = traceback.format_exc()
                self.logger.error(f"❌ Failed to create GenericTextStore for '{domain_name}': {str(e)}")
                self.logger.error(f"🔍 Traceback: {error_traceback}")
                raise ValueError(f"Domain '{domain_name}' could not be initialized: {str(e)}")
            
        return self._stores[domain_name]
    
    def get_data_science_store(self) -> DataScienceTextStore:
        """Get Data Science text store (convenience method)"""
        return self.get_store(TextStoreDomain.DATA_SCIENCE)
    
    def get_medical_store(self) -> MedicalTextStore:
        """Get Medical text store (convenience method)"""
        return self.get_store(TextStoreDomain.MEDICAL)
    
    def list_available_domains(self) -> Dict[str, str]:
        """Get all available domains"""
        if not self._initialized:
            self.initialize()
            
        return {name: name.upper() for name in self._stores.keys()}
    
    def is_initialized(self) -> bool:
        """Check if factory is initialized"""
        return self._initialized
    
    def get_store_by_name(self, domain_name: str) -> BaseTextStoreService:
        """Get store by domain name string"""
        return self.get_store(domain_name)

    def remove_store(self, domain_name: str) -> bool:
        """Remove a store from the factory cache and cleanup resources"""
        domain_name = domain_name.lower()
        if domain_name in self._stores:
            store = self._stores[domain_name]
            try:
                store.cleanup()
            except Exception as e:
                self.logger.error(f"❌ Error during cleanup of store '{domain_name}': {str(e)}")
            
            del self._stores[domain_name]
            import gc
            gc.collect()
            self.logger.info(f"🗑️ Removed domain '{domain_name}' from Text Store Factory cache and ran GC")
            return True
        return False


# Singleton factory instance
_text_store_factory_instance = None

def get_text_store_factory() -> TextStoreFactory:
    """Get singleton text store factory instance"""
    global _text_store_factory_instance
    if _text_store_factory_instance is None:
        _text_store_factory_instance = TextStoreFactory()
    return _text_store_factory_instance
