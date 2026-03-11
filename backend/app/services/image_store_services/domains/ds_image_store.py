"""
Data Science Image Store

Domain-specific image store implementation for Data Science domain.
Extends base functionality with DS-specific features and configuration.
"""

import os
from typing import Dict, Any, List
from ..base.image_store_base import BaseImageStoreService


class DataScienceImageStore(BaseImageStoreService):
    """Image store service for Data Science domain"""
    
    def __init__(self):
        super().__init__("data_science")
    
    def _get_domain_config(self) -> Dict[str, str]:
        """Get Data Science domain-specific configuration"""
        return {
            "directory": os.getenv("DS_IMAGE_DB_DIRECTORY", "./vector_databases/ds_image_db_llama"),
            "collection_name": os.getenv("DS_IMAGE_DB_COLLECTION_NAME", "ds_image_db_llama")
        }
    
    def _get_default_metadata_schema(self) -> Dict[str, Any]:
        """Get Data Science-specific metadata schema"""
        return {
            "chart_type": "",  # Bar, Line, Scatter, Heatmap, etc.
            "data_context": "",  # What the data represents
            "statistical_concept": "",  # Correlation, Distribution, etc.
            "programming_language": "",  # Python, R, SQL, etc.
            "library_used": "",  # matplotlib, seaborn, plotly, etc.
            "complexity_level": "",  # Basic, Intermediate, Advanced
            "contains_code": False,  # Image shows code snippets
            "interactive_viz": False,  # Interactive visualization
            "algorithm_diagram": False,  # Shows algorithm flow
        }
    
    def _get_domain_specific_fields(self, metadata: Dict) -> Dict[str, Any]:
        """Add Data Science-specific fields to document output"""
        return {
            "chart_type": metadata.get("chart_type", ""),
            "data_context": metadata.get("data_context", ""),
            "statistical_concept": metadata.get("statistical_concept", ""),
            "programming_language": metadata.get("programming_language", ""),
            "library_used": metadata.get("library_used", ""),
            "complexity_level": metadata.get("complexity_level", ""),
            "contains_code": metadata.get("contains_code", False),
            "interactive_viz": metadata.get("interactive_viz", False),
            "algorithm_diagram": metadata.get("algorithm_diagram", False),
        }
    
    def _get_domain_specific_metadata(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add Data Science-specific metadata"""
        return {
            "chart_type": doc_data.get("chart_type", ""),
            "data_context": doc_data.get("data_context", ""),
            "statistical_concept": doc_data.get("statistical_concept", ""),
            "programming_language": doc_data.get("programming_language", ""),
            "library_used": doc_data.get("library_used", ""),
            "complexity_level": doc_data.get("complexity_level", ""),
            "contains_code": doc_data.get("contains_code", False),
            "interactive_viz": doc_data.get("interactive_viz", False),
            "algorithm_diagram": doc_data.get("algorithm_diagram", False),
        }
    
    def get_images_by_chart_type(self, chart_type: str) -> List[Dict[str, Any]]:
        """Get images by chart type"""
        all_docs = self.get_all_documents()
        return [doc for doc in all_docs if doc.get("chart_type") == chart_type]
    
    def get_images_by_programming_language(self, language: str) -> List[Dict[str, Any]]:
        """Get images by programming language"""
        all_docs = self.get_all_documents()
        return [doc for doc in all_docs if doc.get("programming_language") == language]
    
    def search_visualization_library(self, library: str, query: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for images created with specific visualization library"""
        if query:
            results = self.search_documents_by_content(query, limit=limit * 2)
        else:
            results = self.get_all_documents()
        
        library_results = [doc for doc in results if doc.get("library_used") == library]
        return library_results[:limit] if limit else library_results
    
    def get_algorithm_diagrams(self, query: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Get algorithm diagram images"""
        if query:
            results = self.search_documents_by_content(query, limit=limit * 2)
        else:
            results = self.get_all_documents()
        
        diagrams = [doc for doc in results if doc.get("algorithm_diagram", False)]
        return diagrams[:limit] if limit else diagrams
    
    def get_code_screenshots(self, query: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Get images that contain code"""
        if query:
            results = self.search_documents_by_content(query, limit=limit * 2)
        else:
            results = self.get_all_documents()
        
        code_images = [doc for doc in results if doc.get("contains_code", False)]
        return code_images[:limit] if limit else code_images
    
    def search_by_statistical_concept(self, concept: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for images by statistical concept"""
        all_docs = self.get_all_documents()
        return [doc for doc in all_docs if doc.get("statistical_concept") == concept][:limit]