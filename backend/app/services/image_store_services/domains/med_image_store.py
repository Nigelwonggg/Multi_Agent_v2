"""
Medical Image Store

Domain-specific image store implementation for Medical domain.
Extends base functionality with medical-specific features and configuration.
"""

import os
from typing import Dict, Any, List
from ..base.image_store_base import BaseImageStoreService


class MedicalImageStore(BaseImageStoreService):
    """Image store service for Medical domain"""
    
    def __init__(self):
        super().__init__("medical")
    
    def _get_domain_config(self) -> Dict[str, str]:
        """Get Medical domain-specific configuration"""
        return {
            "directory": os.getenv("MED_IMAGE_DB_DIRECTORY", "./vector_databases/med_image_db"),
            "collection_name": os.getenv("MED_IMAGE_DB_COLLECTION_NAME", "med_image_db")
        }
    
    def _get_default_metadata_schema(self) -> Dict[str, Any]:
        """Get Medical-specific metadata schema"""
        return {
            "imaging_modality": "",  # X-Ray, CT, MRI, Ultrasound, etc.
            "body_part": "",  # Heart, Brain, Chest, etc.
            "pathology_type": "",  # Normal, Abnormal, Benign, Malignant
            "medical_specialty": "",  # Radiology, Cardiology, etc.
            "patient_age_group": "",  # Pediatric, Adult, Geriatric
            "clinical_indication": "",  # Reason for imaging
            "contrast_used": False,  # Whether contrast agent was used
            "contains_annotations": False,  # Image has medical annotations
            "diagnostic_quality": "",  # Excellent, Good, Fair, Poor
            "privacy_level": "",  # Public, Restricted, Confidential
        }
    
    def _get_domain_specific_fields(self, metadata: Dict) -> Dict[str, Any]:
        """Add Medical-specific fields to document output"""
        return {
            "imaging_modality": metadata.get("imaging_modality", ""),
            "body_part": metadata.get("body_part", ""),
            "pathology_type": metadata.get("pathology_type", ""),
            "medical_specialty": metadata.get("medical_specialty", ""),
            "patient_age_group": metadata.get("patient_age_group", ""),
            "clinical_indication": metadata.get("clinical_indication", ""),
            "contrast_used": metadata.get("contrast_used", False),
            "contains_annotations": metadata.get("contains_annotations", False),
            "diagnostic_quality": metadata.get("diagnostic_quality", ""),
            "privacy_level": metadata.get("privacy_level", ""),
        }
    
    def _get_domain_specific_metadata(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add Medical-specific metadata"""
        return {
            "imaging_modality": doc_data.get("imaging_modality", ""),
            "body_part": doc_data.get("body_part", ""),
            "pathology_type": doc_data.get("pathology_type", ""),
            "medical_specialty": doc_data.get("medical_specialty", ""),
            "patient_age_group": doc_data.get("patient_age_group", ""),
            "clinical_indication": doc_data.get("clinical_indication", ""),
            "contrast_used": doc_data.get("contrast_used", False),
            "contains_annotations": doc_data.get("contains_annotations", False),
            "diagnostic_quality": doc_data.get("diagnostic_quality", ""),
            "privacy_level": doc_data.get("privacy_level", ""),
        }
    
    def get_images_by_modality(self, modality: str) -> List[Dict[str, Any]]:
        """Get images by imaging modality (X-Ray, CT, MRI, etc.)"""
        all_docs = self.get_all_documents()
        return [doc for doc in all_docs if doc.get("imaging_modality") == modality]
    
    def get_images_by_body_part(self, body_part: str) -> List[Dict[str, Any]]:
        """Get images by body part"""
        all_docs = self.get_all_documents()
        return [doc for doc in all_docs if doc.get("body_part") == body_part]
    
    def get_images_by_pathology(self, pathology_type: str) -> List[Dict[str, Any]]:
        """Get images by pathology type"""
        all_docs = self.get_all_documents()
        return [doc for doc in all_docs if doc.get("pathology_type") == pathology_type]
    
    def search_by_clinical_indication(self, indication: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for images by clinical indication"""
        all_docs = self.get_all_documents()
        return [doc for doc in all_docs if doc.get("clinical_indication") == indication][:limit]
    
    def get_annotated_images(self, query: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Get medical images with annotations"""
        if query:
            results = self.search_documents_by_content(query, limit=limit * 2)
        else:
            results = self.get_all_documents()
        
        annotated = [doc for doc in results if doc.get("contains_annotations", False)]
        return annotated[:limit] if limit else annotated
    
    def get_high_quality_images(self, query: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Get high diagnostic quality images"""
        if query:
            results = self.search_documents_by_content(query, limit=limit * 2)
        else:
            results = self.get_all_documents()
        
        high_quality = [doc for doc in results if doc.get("diagnostic_quality") in ["Excellent", "Good"]]
        return high_quality[:limit] if limit else high_quality
    
    def search_pediatric_images(self, query: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for pediatric medical images"""
        if query:
            results = self.search_documents_by_content(query, limit=limit * 2)
        else:
            results = self.get_all_documents()
        
        pediatric = [doc for doc in results if doc.get("patient_age_group") == "Pediatric"]
        return pediatric[:limit] if limit else pediatric
    
    def get_contrast_studies(self, query: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Get images from contrast studies"""
        if query:
            results = self.search_documents_by_content(query, limit=limit * 2)
        else:
            results = self.get_all_documents()
        
        contrast_studies = [doc for doc in results if doc.get("contrast_used", False)]
        return contrast_studies[:limit] if limit else contrast_studies