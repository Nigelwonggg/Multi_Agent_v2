"""
Generic Text Store

Generic implementation for any domain not explicitly defined.
"""

import os
from typing import Dict, Any
from ..base.text_store_base import BaseTextStoreService

class GenericTextStore(BaseTextStoreService):
    """Text store service for generic domains"""
    
    def __init__(self, domain: str):
        super().__init__(domain)
    
    def _get_domain_config(self) -> Dict[str, str]:
        """Get generic domain configuration"""
        # Standardize directory and collection naming for new domains
        return {
            "directory": f"./vector_databases/custom_domains/{self.domain}_text_db",
            "collection_name": f"{self.domain}_text_db"
        }
    
    def _get_default_metadata_schema(self) -> Dict[str, Any]:
        """Get generic metadata schema"""
        return {}
    
    def _get_domain_specific_fields(self, metadata: Dict) -> Dict[str, Any]:
        """No domain-specific fields for generic store"""
        return {}
    
    def _get_domain_specific_metadata(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """No domain-specific metadata for generic store"""
        return {}
