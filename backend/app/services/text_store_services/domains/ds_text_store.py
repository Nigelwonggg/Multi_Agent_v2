"""
Data Science Text Store

Domain-specific text store implementation for Data Science domain.
Extends base functionality with DS-specific features and configuration.
"""

import os
from typing import Dict, Any
from ..base.text_store_base import BaseTextStoreService

class DataScienceTextStore(BaseTextStoreService):
    """Text store service for Data Science domain"""
    
    def __init__(self):
        super().__init__("data_science")
    
    def _get_domain_config(self) -> Dict[str, str]:
        """Get Data Science domain-specific configuration"""
        return {
            "directory": os.getenv("DS_TEXT_DB_DIRECTORY", "./vector_databases/ds_text_db_llama"),
            "collection_name": os.getenv("DS_TEXT_DB_COLLECTION_NAME", "ds_text_db_llama")
        }
    
    # Domain-specific configuration and methods
    # !!!! Now is just some examples, it is not working yet
    def _get_default_metadata_schema(self) -> Dict[str, Any]:
        """Get Data Science-specific metadata schema"""
        return {
            "subject_area": "",  # ML, Statistics, Programming, etc.
            "difficulty_level": "",  # Beginner, Intermediate, Advanced
            "learning_objective": "",  # What students should learn
            "prerequisites": [],  # Required prior knowledge
            "code_examples": False,  # Contains code examples
            "mathematical_content": False,  # Contains mathematical formulas
        }
    
    def _get_domain_specific_fields(self, metadata: Dict) -> Dict[str, Any]:
        """Add Data Science-specific fields to document output"""
        return {
            "subject_area": metadata.get("subject_area", ""),
            "difficulty_level": metadata.get("difficulty_level", ""),
            "learning_objective": metadata.get("learning_objective", ""),
            "prerequisites": metadata.get("prerequisites", []),
            "code_examples": metadata.get("code_examples", False),
            "mathematical_content": metadata.get("mathematical_content", False),
        }
    
    def _get_domain_specific_metadata(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add Data Science-specific metadata"""
        return {
            "subject_area": doc_data.get("subject_area", ""),
            "difficulty_level": doc_data.get("difficulty_level", ""),
            "learning_objective": doc_data.get("learning_objective", ""),
            "prerequisites": doc_data.get("prerequisites", []),
            "code_examples": doc_data.get("code_examples", False),
            "mathematical_content": doc_data.get("mathematical_content", False),
        }
    
    def get_documents_by_subject_area(self, subject_area: str) -> list:
        """Get documents by subject area (DS-specific method)"""
        all_docs = self.get_all_documents()
        return [doc for doc in all_docs if doc.get("subject_area") == subject_area]
    
    def get_documents_by_difficulty(self, difficulty_level: str) -> list:
        """Get documents by difficulty level (DS-specific method)"""
        all_docs = self.get_all_documents()
        return [doc for doc in all_docs if doc.get("difficulty_level") == difficulty_level]
    
    def search_with_code_examples(self, query: str, limit: int = 10) -> list:
        """Search for documents that contain code examples"""
        results = self.search_documents_by_content(query, limit=limit)
        return [doc for doc in results if doc.get("code_examples", False)]
    
    def search_mathematical_content(self, query: str, limit: int = 10) -> list:
        """Search for documents with mathematical content"""
        results = self.search_documents_by_content(query, limit=limit)
        return [doc for doc in results if doc.get("mathematical_content", False)]