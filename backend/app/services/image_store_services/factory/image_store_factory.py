"""
Image Store Factory

Factory pattern for managing image store services across different domains.
Provides centralized access and singleton management.
"""

from typing import Dict, Optional
from enum import Enum
from ..base.image_store_base import BaseImageStoreService
from ..domains.ds_image_store import DataScienceImageStore
from ..domains.med_image_store import MedicalImageStore
from app.utils.logging_config import get_logger


class ImageStoreDomain(Enum):
    """Supported image store domains"""
    DATA_SCIENCE = "data_science"
    MEDICAL = "medical"


class ImageStoreFactory:
    """Factory class for managing image store services"""
    
    def __init__(self):
        self.logger = get_logger("services.image_store_factory")
        self._stores: Dict[ImageStoreDomain, BaseImageStoreService] = {}
        self._initialized = False
    
    def initialize(self) -> None:
        """Initialize all image store services"""
        if self._initialized:
            return
            
        self.logger.info("🏭 Initializing Image Store Factory...")
        
        try:
            # Initialize domain-specific stores
            self._stores[ImageStoreDomain.DATA_SCIENCE] = DataScienceImageStore()
            self._stores[ImageStoreDomain.MEDICAL] = MedicalImageStore()
            
            self._initialized = True
            self.logger.info("✅ Image Store Factory initialized successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Image Store Factory: {str(e)}")
            raise
    
    def get_store(self, domain: ImageStoreDomain) -> BaseImageStoreService:
        """Get image store service by domain"""
        if not self._initialized:
            self.initialize()
            
        if domain not in self._stores:
            available = list(self._stores.keys())
            raise ValueError(f"Domain '{domain}' not available. Available: {available}")
            
        return self._stores[domain]
    
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
            
        return {domain.value: domain.name for domain in self._stores.keys()}
    
    def is_initialized(self) -> bool:
        """Check if factory is initialized"""
        return self._initialized
    
    def get_store_by_name(self, domain_name: str) -> BaseImageStoreService:
        """Get store by domain name string"""
        try:
            domain = ImageStoreDomain(domain_name.lower())
            return self.get_store(domain)
        except ValueError:
            available = [d.value for d in ImageStoreDomain]
            raise ValueError(f"Invalid domain name '{domain_name}'. Available: {available}")


# Singleton factory instance
_image_store_factory_instance = None

def get_image_store_factory() -> ImageStoreFactory:
    """Get singleton image store factory instance"""
    global _image_store_factory_instance
    if _image_store_factory_instance is None:
        _image_store_factory_instance = ImageStoreFactory()
        _image_store_factory_instance.initialize()
    return _image_store_factory_instance