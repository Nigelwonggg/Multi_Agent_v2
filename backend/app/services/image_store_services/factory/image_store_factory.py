"""
Image Store Factory

Factory pattern for managing image store services across different domains.
Provides centralized access and singleton management.
"""

from typing import Dict, Optional, Union
from enum import Enum
from ..base.image_store_base import BaseImageStoreService
from ..domains.ds_image_store import DataScienceImageStore
from ..domains.med_image_store import MedicalImageStore
from ..domains.generic_image_store import GenericImageStore
from app.utils.logging_config import get_logger


class ImageStoreDomain(Enum):
    """Supported image store domains"""
    DATA_SCIENCE = "data_science"
    MEDICAL = "medical"


class ImageStoreFactory:
    """Factory class for managing image store services"""
    
    def __init__(self):
        self.logger = get_logger("services.image_store_factory")
        self._stores: Dict[str, BaseImageStoreService] = {}
        self._initialized = False
        self._store_classes = {
            ImageStoreDomain.DATA_SCIENCE: DataScienceImageStore,
            ImageStoreDomain.MEDICAL: MedicalImageStore,
        }
    
    def initialize(self) -> None:
        """Initialize all image store services"""
        if self._initialized:
            return
            
        self.logger.info("🏭 Initializing Image Store Factory...")
        
        try:
            # Initialize domain-specific stores
            self._stores[ImageStoreDomain.DATA_SCIENCE.value] = DataScienceImageStore()
            self._stores[ImageStoreDomain.MEDICAL.value] = MedicalImageStore()
            
            self._initialized = True
            self.logger.info("✅ Image Store Factory initialized successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Image Store Factory: {str(e)}")
            raise
    
    def get_store(self, domain: Union[ImageStoreDomain, str]) -> BaseImageStoreService:
        """Get image store service by domain"""
        if not self._initialized:
            self.initialize()
            
        domain_name = domain.value if isinstance(domain, ImageStoreDomain) else domain.lower()
            
        if domain_name not in self._stores:
            self.logger.info(f"🔍 Domain '{domain_name}' not found in active stores. Creating GenericImageStore...")
            try:
                # Dynamically create a generic store for the new domain
                self._stores[domain_name] = GenericImageStore(domain_name)
            except Exception as e:
                import traceback
                error_traceback = traceback.format_exc()
                self.logger.error(f"❌ Failed to create GenericImageStore for '{domain_name}': {str(e)}")
                self.logger.error(f"🔍 Traceback: {error_traceback}")
                raise ValueError(f"Domain '{domain_name}' could not be initialized: {str(e)}")
            
        return self._stores[domain_name]
    
    def get_data_science_store(self) -> DataScienceImageStore:
        """Get Data Science image store (convenience method)"""
        return self.get_store(ImageStoreDomain.DATA_SCIENCE)
    
    def get_medical_store(self) -> MedicalImageStore:
        """Get Medical image store (convenience method)"""
        return self.get_store(ImageStoreDomain.MEDICAL)
    
    def list_available_domains(self) -> Dict[str, str]:
        """Get all available domains"""
        if not self._initialized:
            self.initialize()
            
        return {name: name.upper() for name in self._stores.keys()}
    
    def is_initialized(self) -> bool:
        """Check if factory is initialized"""
        return self._initialized
    
    def get_store_by_name(self, domain_name: str) -> BaseImageStoreService:
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
                self.logger.error(f"❌ Error during cleanup of image store '{domain_name}': {str(e)}")
            
            del self._stores[domain_name]
            import gc
            gc.collect()
            self.logger.info(f"🗑️ Removed domain '{domain_name}' from Image Store Factory cache and ran GC")
            return True
        return False


# Singleton factory instance
_image_store_factory_instance = None

def get_image_store_factory() -> ImageStoreFactory:
    """Get singleton image store factory instance"""
    global _image_store_factory_instance
    if _image_store_factory_instance is None:
        _image_store_factory_instance = ImageStoreFactory()
    return _image_store_factory_instance
