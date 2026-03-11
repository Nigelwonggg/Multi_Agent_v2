"""
Text Store Domain Implementations

Contains domain-specific text store implementations.
"""

from .ds_text_store import DataScienceTextStore
from .med_text_store import MedicalTextStore

__all__ = ['DataScienceTextStore', 'MedicalTextStore']