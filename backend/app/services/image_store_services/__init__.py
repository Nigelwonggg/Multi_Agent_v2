"""
Image Store Services

Modular image store services with base class and domain-specific implementations.
Provides factory pattern for easy access to different domain image stores.
"""

from .base import BaseImageStoreService
from .domains import DataScienceImageStore, MedicalImageStore
from .factory import ImageStoreFactory, get_image_store_factory, ImageStoreDomain

__all__ = [
    'BaseImageStoreService',
    'DataScienceImageStore',
    'MedicalImageStore',
    'ImageStoreFactory',
    'get_image_store_factory',
    'ImageStoreDomain'
]

# Convenience factory instance
image_store_factory = get_image_store_factory()