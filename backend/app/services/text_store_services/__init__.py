"""
Text Store Services

Modular text store services with base class and domain-specific implementations.
Provides factory pattern for easy access to different domain text stores.
"""

from .base import BaseTextStoreService
from .domains import DataScienceTextStore, MedicalTextStore
from .factory import TextStoreFactory, get_text_store_factory, TextStoreDomain

__all__ = [
    'BaseTextStoreService',
    'DataScienceTextStore',
    'MedicalTextStore',
    'TextStoreFactory',
    'get_text_store_factory',
    'TextStoreDomain'
]

# Convenience factory instance
text_store_factory = get_text_store_factory()