"""
Embedding Service

Centralized embedding service with singleton pattern.
Manages HuggingFace embedding models for efficient resource usage.
"""

import os
from typing import List, Optional
from langchain_huggingface import HuggingFaceEmbeddings
from app.utils.logging_config import get_logger


class EmbeddingService:
    """Centralized embedding service with singleton pattern"""
    
    def __init__(self):
        self.logger = get_logger("llm_services.embedding")
        self._embeddings: Optional[HuggingFaceEmbeddings] = None
        self._initialized = False
        
        # Default embedding model
        self.model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-mpnet-base-v2")
    
    def initialize(self) -> None:
        """Initialize the embedding service if not already done"""
        if not self._initialized:
            self.logger.info(f"🚀 Initializing embedding service with model: {self.model_name}")
            try:
                self._embeddings = HuggingFaceEmbeddings(model_name=self.model_name)
                self._initialized = True
                self.logger.info("✅ Embedding service initialized successfully")
            except Exception as e:
                self.logger.error(f"❌ Failed to initialize embedding service: {str(e)}")
                raise
    
    def get_embeddings(self) -> HuggingFaceEmbeddings:
        """Get the embedding instance"""
        if not self._initialized:
            self.initialize()
        return self._embeddings
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of documents"""
        embeddings = self.get_embeddings()
        return embeddings.embed_documents(texts)
    
    def embed_query(self, text: str) -> List[float]:
        """Embed a single query"""
        embeddings = self.get_embeddings()
        return embeddings.embed_query(text)
    
    def is_initialized(self) -> bool:
        """Check if service is initialized"""
        return self._initialized


# Singleton instance
_embedding_instance = None

def get_embedding_service() -> EmbeddingService:
    """Get singleton embedding service instance"""
    global _embedding_instance
    if _embedding_instance is None:
        _embedding_instance = EmbeddingService()
        _embedding_instance.initialize()
    return _embedding_instance