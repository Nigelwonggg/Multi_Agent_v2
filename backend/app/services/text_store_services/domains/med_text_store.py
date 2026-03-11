"""
Medical Text Store

Domain-specific text store implementation for Medical domain.
Extends base functionality with medical-specific features and configuration.
"""

import os
from typing import Dict, Any, List
from ..base.text_store_base import BaseTextStoreService


class MedicalTextStore(BaseTextStoreService):
    """Text store service for Medical domain"""
    
    def __init__(self):
        super().__init__("medical")
    
    def _get_domain_config(self) -> Dict[str, str]:
        """Get Medical domain-specific configuration"""
        return {
            "directory": os.getenv("MED_TEXT_DB_DIRECTORY", "./vector_databases/med_text_db"),
            "collection_name": os.getenv("MED_TEXT_DB_COLLECTION_NAME", "med_text_db")
        }
    
    # Domain-specific configuration and custom methods
    # !!!! Now is just some possible examples, the actual implementation may vary
    def _get_default_metadata_schema(self) -> Dict[str, Any]:
        """Get Medical-specific metadata schema"""
        return {
            "medical_specialty": "",  # Cardiology, Neurology, etc.
            "patient_demographics": "",  # Age group, gender considerations
            "clinical_context": "",  # Diagnosis, Treatment, Prevention, etc.
            "evidence_level": "",  # A, B, C based on research quality
            "icd_codes": [],  # Related ICD-10 codes
            "drug_information": False,  # Contains drug/medication info
            "contraindications": [],  # Medical contraindications
            "dosage_information": False,  # Contains dosage information
        }
    
    def _get_domain_specific_fields(self, metadata: Dict) -> Dict[str, Any]:
        """Add Medical-specific fields to document output"""
        return {
            "medical_specialty": metadata.get("medical_specialty", ""),
            "patient_demographics": metadata.get("patient_demographics", ""),
            "clinical_context": metadata.get("clinical_context", ""),
            "evidence_level": metadata.get("evidence_level", ""),
            "icd_codes": metadata.get("icd_codes", []),
            "drug_information": metadata.get("drug_information", False),
            "contraindications": metadata.get("contraindications", []),
            "dosage_information": metadata.get("dosage_information", False),
        }
    
    def _get_domain_specific_metadata(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add Medical-specific metadata"""
        return {
            "medical_specialty": doc_data.get("medical_specialty", ""),
            "patient_demographics": doc_data.get("patient_demographics", ""),
            "clinical_context": doc_data.get("clinical_context", ""),
            "evidence_level": doc_data.get("evidence_level", ""),
            "icd_codes": doc_data.get("icd_codes", []),
            "drug_information": doc_data.get("drug_information", False),
            "contraindications": doc_data.get("contraindications", []),
            "dosage_information": doc_data.get("dosage_information", False),
        }
    
    def get_documents_by_specialty(self, specialty: str) -> List[Dict[str, Any]]:
        """Get documents by medical specialty"""
        all_docs = self.get_all_documents()
        return [doc for doc in all_docs if doc.get("medical_specialty") == specialty]
    
    def get_documents_by_clinical_context(self, context: str) -> List[Dict[str, Any]]:
        """Get documents by clinical context (diagnosis, treatment, etc.)"""
        all_docs = self.get_all_documents()
        return [doc for doc in all_docs if doc.get("clinical_context") == context]
    
    def search_drug_information(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for documents containing drug information"""
        results = self.search_documents_by_content(query, limit=limit)
        return [doc for doc in results if doc.get("drug_information", False)]
    
    def search_by_icd_code(self, icd_code: str) -> List[Dict[str, Any]]:
        """Search for documents by ICD code"""
        all_docs = self.get_all_documents()
        return [doc for doc in all_docs if icd_code in doc.get("icd_codes", [])]
    
    def get_high_evidence_documents(self, query: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Get documents with high evidence level (A or B)"""
        if query:
            docs = self.search_documents_by_content(query, limit=limit * 2)  # Get more to filter
        else:
            docs = self.get_all_documents()
        
        high_evidence = [doc for doc in docs if doc.get("evidence_level") in ["A", "B"]]
        return high_evidence[:limit] if limit else high_evidence
    
    def search_with_contraindications(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for documents that include contraindication information"""
        results = self.search_documents_by_content(query, limit=limit)
        return [doc for doc in results if doc.get("contraindications")]