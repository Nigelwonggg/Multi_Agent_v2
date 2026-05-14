"""
Base Image Store Service

Abstract base class for all image store implementations.
Provides common interface and functionality for different domains.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
import chromadb
from chromadb.config import Settings
from langchain_chroma import Chroma
from langchain.schema.document import Document
import os
import uuid
import time
from app.utils.logging_config import get_logger
from app.services.llm import get_embedding_service


class BaseImageStoreService(ABC):
    """Abstract base class for image store services"""
    
    def __init__(self, domain: str, collection_suffix: str = ""):
        self.domain = domain
        self.logger = get_logger(f"services.image_store.{domain}")
        
        # Get domain-specific configuration
        self.config = self._get_domain_config()
        
        # Ensure absolute path and directory exists
        persist_dir = os.path.abspath(self.config["directory"])
        
        # Initialize embeddings from centralized service
        embedding_service = get_embedding_service()
        self.embeddings = embedding_service.get_embeddings()
        
        # Initialize vector store with explicit client for better reliability
        collection_name = self.config["collection_name"] + collection_suffix
        self.logger.info(f"🚀 Initializing Chroma for image domain '{domain}' at {persist_dir}")
        
        # Ensure directory exists only when we are about to initialize
        os.makedirs(persist_dir, exist_ok=True)

        try:
            # Use a single, standard initialization path with explicit settings
            # We match what langchain_chroma uses by default to avoid "different settings" errors
            self.logger.info(f"🚀 Initializing Chroma for image domain '{domain}' at {persist_dir}")
            
            client_settings = Settings(
                anonymized_telemetry=False, 
                is_persistent=True,
                persist_directory=persist_dir
            )
            
            self.image_store = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                persist_directory=persist_dir,
                client_settings=client_settings
            )
            self.client = getattr(self.image_store, "_client", None)
            self.logger.info(f"✅ {domain} image store initialized: {persist_dir}")
            
        except Exception as e:
            error_str = str(e)
            self.logger.error(f"❌ Failed to initialize Chroma for image domain {domain}: {error_str}")
            
            # If it already exists or has tenant issues, try the most basic connection
            if "already exists" in error_str or "tenant" in error_str:
                self.logger.info(f"🔄 Attempting simplified connection for image domain {domain}...")
                try:
                    self.image_store = Chroma(
                        collection_name=collection_name,
                        embedding_function=self.embeddings,
                        persist_directory=persist_dir
                    )
                    self.client = getattr(self.image_store, "_client", None)
                    self.logger.info(f"✅ {domain} image store connected (simplified)")
                except Exception as e2:
                    self.logger.error(f"❌ Simplified image connection also failed: {str(e2)}")
                    raise e2
            else:
                raise e
        
        # Initialize retriever
        self.image_retriever = self.image_store.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={"score_threshold": 0.2}
        )

    def cleanup(self) -> None:
        """Explicitly release resources and close database connections"""
        try:
            if hasattr(self, 'image_store') and self.image_store:
                self.logger.info(f"🧹 Performing aggressive cleanup for image domain '{self.domain}'")
                
                # 1. Clear retriever
                self.image_retriever = None
                
                # 2. Try to close the internal client
                # First check our stored client
                if hasattr(self, 'client') and self.client:
                    try:
                        # For Chroma > 0.4.x, stop the system
                        if hasattr(self.client, '_system'):
                            self.client._system.stop()
                            self.logger.info(f"✅ Stopped Chroma client system")
                        
                        # Explicit close if available
                        if hasattr(self.client, 'close'):
                            self.client.close()
                            self.logger.info(f"✅ Closed Chroma client")
                    except Exception as e:
                        self.logger.warning(f"⚠️ Error closing stored client: {str(e)}")

                # Try to find client inside the image_store object too
                client = getattr(self.image_store, '_client', None)
                if client:
                    try:
                        # Try explicit close if available
                        if hasattr(client, 'close'):
                            client.close()
                            self.logger.info(f"✅ Closed internal Chroma client")
                        
                        # Try stopping the system (Chroma internal)
                        if hasattr(client, '_system'):
                            client._system.stop()
                            self.logger.info(f"✅ Stopped internal Chroma system")
                    except:
                        pass
                
                # 3. Manually clear internal references from Chroma object
                internal_attrs = ['_client', '_collection', '_api']
                for attr in internal_attrs:
                    if hasattr(self.image_store, attr):
                        try:
                            setattr(self.image_store, attr, None)
                        except:
                            pass
                
                # 4. Clear the store and client
                self.image_store = None
                self.client = None

                # 5. Force GC
                import gc
                gc.collect()
                
                self.logger.info(f"🗑️ Released image store resources for domain '{self.domain}'")
        except Exception as e:
            self.logger.error(f"❌ Error during aggressive cleanup for image domain '{self.domain}': {str(e)}")
    
    @abstractmethod
    def _get_domain_config(self) -> Dict[str, str]:
        """Get domain-specific configuration"""
        pass
    
    @abstractmethod
    def _get_default_metadata_schema(self) -> Dict[str, Any]:
        """Get domain-specific default metadata schema"""
        pass
    
    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Get all image documents from the vector store"""
        try:
            data = self.image_store._collection.get()
            docs = []
            
            for i, doc_id in enumerate(data["ids"]):
                image_summary = data["documents"][i]
                metadata = data["metadatas"][i] or {}
                
                # Use domain-specific document formatting
                doc_data = self._format_document_output(i + 1, doc_id, image_summary, metadata)
                docs.append(doc_data)
            
            self.logger.info(f"Retrieved {len(docs)} image documents")
            return docs
        except Exception as e:
            self.logger.error(f"Error retrieving image documents: {str(e)}")
            return []
    
    def _format_document_output(self, id: int, doc_id: str, image_summary: str, metadata: Dict) -> Dict[str, Any]:
        """Format document output with domain-specific fields"""
        # Base format
        doc_data = {
            "id": id,
            "doc_id": doc_id,
            "image_summary": image_summary,
            "image_base64": metadata.get("base64_image", ""),
            "category": metadata.get("category", ""),
            "filename": metadata.get("filename", ""),
            "page_number": self._safe_int_conversion(metadata.get("page_number"))
        }
        
        # Add domain-specific fields
        domain_fields = self._get_domain_specific_fields(metadata)
        doc_data.update(domain_fields)
        
        return doc_data
    
    def _get_domain_specific_fields(self, metadata: Dict) -> Dict[str, Any]:
        """Override in subclasses to add domain-specific fields"""
        return {}
    
    def _safe_int_conversion(self, value: Any) -> Optional[int]:
        """Safely convert value to int or return None"""
        if value is not None:
            try:
                return int(value)
            except (ValueError, TypeError):
                pass
        return None
    
    def get_documents_paginated(
        self, 
        page: int = 1, 
        page_size: int = 10,
        category: Optional[str] = None,
        filename: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get paginated image documents with filtering"""
        all_docs = self.get_all_documents()
        filtered_docs = all_docs
        
        if category:
            filtered_docs = [doc for doc in filtered_docs if doc["category"] == category]
        
        if filename:
            filtered_docs = [doc for doc in filtered_docs if doc["filename"] == filename]
        
        if search:
            filtered_docs = [
                doc for doc in filtered_docs 
                if (search.lower() in doc["image_summary"].lower() or 
                    search.lower() in doc["filename"].lower())
            ]
        
        total = len(filtered_docs)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_docs = filtered_docs[start_idx:end_idx]
        
        return paginated_docs, total
    
    def get_filter_options(self, category: Optional[str] = None) -> Dict[str, List[str]]:
        """Get unique categories and filenames for filter options"""
        all_docs = self.get_all_documents()
        
        categories = sorted(list(set(doc["category"] for doc in all_docs if doc["category"])))
        
        if category:
            filtered_docs = [doc for doc in all_docs if doc["category"] == category]
            filenames = sorted(list(set(doc["filename"] for doc in filtered_docs if doc["filename"])))
        else:
            filenames = sorted(list(set(doc["filename"] for doc in all_docs if doc["filename"])))
        
        return {
            "categories": categories,
            "filenames": filenames
        }
    
    def get_document_by_doc_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific image document by doc_id"""
        all_docs = self.get_all_documents()
        return next((doc for doc in all_docs if doc["doc_id"] == doc_id), None)
    
    def add_document(self, doc_data: Dict[str, Any]) -> str:
        """Add a new image document to the vector store"""
        doc_id = doc_data.get("doc_id") or f"{self.domain}_img_{uuid.uuid4().hex[:8]}"
        
        # Prepare metadata with domain-specific schema
        metadata = self._prepare_metadata(doc_id, doc_data)
        
        new_doc = Document(
            page_content=doc_data["image_summary"],
            metadata=metadata
        )
        
        self.image_store.add_documents([new_doc], ids=[doc_id])
        self.logger.info(f"Added image document: {doc_id}")
        return doc_id
    
    def _prepare_metadata(self, doc_id: str, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare metadata with domain-specific fields"""
        # Handle page_number conversion to int
        page_number = doc_data.get("page_number")
        if page_number is not None:
            try:
                page_number = int(page_number)
            except (ValueError, TypeError):
                self.logger.warning(f"Invalid page_number '{page_number}' for doc {doc_id}, setting to None")
                page_number = None

        # Base metadata
        metadata = {
            "doc_id": doc_id,
            "base64_image": doc_data.get("image_base64", ""),
            "category": doc_data.get("category", ""),
            "filename": doc_data.get("filename", ""),
            "page_number": page_number
        }
        
        # Add domain-specific metadata
        # domain_metadata = self._get_domain_specific_metadata(doc_data)
        # metadata.update(domain_metadata)
        
        return metadata
    
    def _get_domain_specific_metadata(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Override in subclasses to add domain-specific metadata"""
        return {}
    
    def update_document(self, doc_id: str, doc_data: Dict[str, Any]) -> bool:
        """Update an existing image document"""
        try:
            if not self.get_document_by_doc_id(doc_id):
                return False
            
            metadata = self._prepare_metadata(doc_id, doc_data)
            
            updated_doc = Document(
                page_content=doc_data["image_summary"],
                metadata=metadata
            )
            
            self.image_store.update_document(document_id=doc_id, document=updated_doc)
            self.logger.info(f"Updated image document: {doc_id}")
            return True
        except Exception as e:
            self.logger.error(f"Error updating image document {doc_id}: {str(e)}")
            return False
    
    def delete_document(self, doc_id: str) -> bool:
        """Delete an image document from the vector store"""
        try:
            if not self.get_document_by_doc_id(doc_id):
                return False
            
            self.image_store.delete(ids=[doc_id])
            self.logger.info(f"Deleted image document: {doc_id}")
            return True
        except Exception as e:
            self.logger.error(f"Error deleting image document {doc_id}: {str(e)}")
            return False
    
    def search_documents_by_content(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search image documents using vector similarity"""
        try:
            results = self.image_store.similarity_search(query, k=limit)
            
            docs = []
            for i, doc in enumerate(results):
                metadata = doc.metadata or {}
                doc_data = self._format_document_output(
                    i + 1,
                    metadata.get("doc_id", f"unknown_{i}"),
                    doc.page_content,
                    metadata
                )
                docs.append(doc_data)
            
            self.logger.info(f"Vector search returned {len(docs)} image results")
            return docs
        except Exception as e:
            self.logger.error(f"Error in image vector search: {str(e)}")
            return []
    
    def search_images_by_query(self, query: str, limit: int = 10) -> List[Document]:
        """Search images using vector similarity with retriever"""
        try:
            results = self.image_retriever.invoke(query)
            
            if limit and len(results) > limit:
                results = results[:limit]
            
            self.logger.info(f"Image retriever search returned {len(results)} results")
            return results
        except Exception as e:
            self.logger.error(f"Error in image retriever search: {str(e)}")
            return []
    
    def get_retriever(self):
        """Get the image retriever instance"""
        return self.image_retriever
    
    def update_retriever_config(self, search_type: str = "similarity_score_threshold", 
                              score_threshold: float = 0.2, k: int = 10):
        """Update retriever configuration"""
        search_kwargs = {"score_threshold": score_threshold}
        if search_type == "similarity":
            search_kwargs = {"k": k}
        
        self.image_retriever = self.image_store.as_retriever(
            search_type=search_type,
            search_kwargs=search_kwargs,
        )
        self.logger.info(f"Updated image retriever: {search_type}, kwargs: {search_kwargs}")
    
    def get_documents_by_ids(self, doc_ids: List[str]) -> List[Dict[str, Any]]:
        """Get image documents by their doc_ids"""
        try:
            if not doc_ids:
                return []
            
            all_docs = self.get_all_documents()
            matching_docs = [
                doc for doc in all_docs 
                if doc["doc_id"] in doc_ids
            ]
            
            self.logger.info(f"Found {len(matching_docs)} image documents out of {len(doc_ids)} requested")
            return matching_docs
        except Exception as e:
            self.logger.error(f"Error getting image documents by IDs: {str(e)}")
            return []