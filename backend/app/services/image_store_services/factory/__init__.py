"""
Image Store Factory

Contains the factory class and singleton pattern for image store management.
"""

from .image_store_factory import ImageStoreFactory, get_image_store_factory, ImageStoreDomain

__all__ = ['ImageStoreFactory', 'get_image_store_factory', 'ImageStoreDomain']