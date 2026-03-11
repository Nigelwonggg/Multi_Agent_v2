"""
Text Store Factory

Contains the factory class and singleton pattern for text store management.
"""

from .text_store_factory import TextStoreFactory, get_text_store_factory, TextStoreDomain

__all__ = ['TextStoreFactory', 'get_text_store_factory', 'TextStoreDomain']