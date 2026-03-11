"""
Image Store Domain Implementations

Contains domain-specific image store implementations.
"""

from .ds_image_store import DataScienceImageStore
from .med_image_store import MedicalImageStore

__all__ = ['DataScienceImageStore', 'MedicalImageStore']