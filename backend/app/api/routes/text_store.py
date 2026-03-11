from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List

from app.services.text_store_services import get_text_store_factory
from ...schemas.text_doc_sch import (
    TextDocumentResponse, 
    TextDocumentListResponse,
    TextDocumentCreate,
    TextDocumentUpdate,
    FilterOptionsResponse,
    DeleteResponse,
    SearchRequest,
    DocumentsByIdsRequest,
    DocumentsByDomainRequest
)

from ...utils.logging_config import get_logger

router = APIRouter(prefix="/api/text-store", tags=["text-documents"])
logger = get_logger("api.routes.text-store")

# Get the factory instance
text_factory = get_text_store_factory()

@router.get("/", response_model=TextDocumentListResponse)
async def get_text_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    category: Optional[str] = Query(None),
    filename: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    domain: Optional[str] = Query("data_science", description="Domain to query (data_science, medical)")
):
    """Get paginated list of text documents with optional filtering"""
    try:
        text_store = text_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    documents, total = text_store.get_documents_paginated(
        page=page,
        page_size=page_size,
        category=category,
        filename=filename,
        search=search
    )
    
    return TextDocumentListResponse(
        documents=documents,
        total=total,
        page=page,
        page_size=page_size
    )

@router.get("/filter-options", response_model=FilterOptionsResponse)
async def get_filter_options(
    category: Optional[str] = Query(None),
    domain: Optional[str] = Query("data_science", description="Domain to query (data_science, medical)")
):
    """
    Get available filter options for categories and filenames
    
    Args:
        category: Optional category to filter filenames by
        domain: Domain to query
    """
    try:
        text_store = text_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    options = text_store.get_filter_options(category=category)
    
    return FilterOptionsResponse(
        categories=options["categories"],
        filenames=options["filenames"]
    )

@router.get("/{doc_id}", response_model=TextDocumentResponse)
async def get_text_document(
    doc_id: str,
    domain: Optional[str] = Query("data_science", description="Domain to query (data_science, medical)")
):
    """Get a specific text document by doc_id"""
    try:
        text_store = text_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    document = text_store.get_document_by_doc_id(doc_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document

@router.post("/", response_model=TextDocumentResponse)
async def create_text_document(document_data: TextDocumentCreate):
    """Create a new text document"""
    # Check if doc_id already exists (if provided)
    if document_data.doc_id:
        existing = ds_text_store.get_document_by_doc_id(document_data.doc_id)
        if existing:
            raise HTTPException(status_code=400, detail="Document with this doc_id already exists")
    
    doc_id = ds_text_store.add_document(document_data.dict())
    
    # Return the created document
    created_doc = ds_text_store.get_document_by_doc_id(doc_id)
    if not created_doc:
        raise HTTPException(status_code=500, detail="Failed to create document")
    
    return created_doc

@router.put("/{doc_id}", response_model=TextDocumentResponse)
async def update_text_document(doc_id: str, document_data: TextDocumentUpdate):
    """Update an existing text document"""
    success = ds_text_store.update_document(doc_id, document_data.dict())
    
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Return the updated document
    updated_doc = ds_text_store.get_document_by_doc_id(doc_id)
    return updated_doc

@router.delete("/{doc_id}", response_model=DeleteResponse)
async def delete_text_document(doc_id: str):
    """Delete a text document"""
    success = ds_text_store.delete_document(doc_id)
    
    if not success:
        logger.error(f"Failed to delete document {doc_id}")
        raise HTTPException(status_code=404, detail="Document not found")
    
    logger.info(f"Document {doc_id} deleted successfully")
    return DeleteResponse(success=True)

@router.post("/search", response_model=List[TextDocumentResponse])
async def search_documents_by_content(search_request: SearchRequest):
    """Search documents using vector similarity"""
    documents = ds_text_store.search_documents_by_content(
        search_request.query, 
        search_request.limit
    )
    
    return documents

# Alternative search endpoint with query parameters
@router.get("/search/content", response_model=List[TextDocumentResponse])
async def search_documents_by_query(
    query: str = Query(..., min_length=3),
    limit: int = Query(10, ge=1, le=50)
):
    """Search documents by content using query parameters"""
    documents = ds_text_store.search_documents_by_content(query, limit)
    return documents


@router.post("/by-ids", response_model=List[TextDocumentResponse])
async def get_documents_by_ids(
    request: DocumentsByIdsRequest
) -> List[TextDocumentResponse]:
    """Get multiple documents by their doc_ids (UUIDs)"""
    try:
        logger.info(f"📋 Fetching {len(request.doc_ids)} documents by IDs")
        
        # Query documents by doc_ids using the service
        documents = ds_text_store.get_documents_by_ids(request.doc_ids)
        
        logger.info(f"✅ Found {len(documents)} documents")
        return documents
        
    except Exception as e:
        logger.error(f"❌ Error fetching documents by IDs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")

@router.post("/by-domain", response_model=List[TextDocumentResponse])
async def get_documents_by_domain(
    request: DocumentsByDomainRequest
) -> List[TextDocumentResponse]:
    """Get documents from multiple domains by their doc_ids"""
    try:
        logger.info(f"📋 Fetching documents by domain: {request.docs_by_domain}")
        
        all_documents = []
        
        for domain, doc_ids in request.docs_by_domain.items():
            if not doc_ids:
                continue
                
            logger.info(f"🔍 Fetching {len(doc_ids)} documents from domain '{domain}'")
            
            # Get domain-specific text store
            domain_store = text_factory.get_store_by_name(domain)
            if not domain_store:
                logger.warning(f"⚠️ Domain '{domain}' not found, skipping")
                continue
                
            # Query documents by doc_ids for this domain
            domain_documents = domain_store.get_documents_by_ids(doc_ids)
            all_documents.extend(domain_documents)
            
            logger.info(f"✅ Found {len(domain_documents)} documents from domain '{domain}'")
        
        logger.info(f"✅ Total documents found: {len(all_documents)}")
        return all_documents
        
    except Exception as e:
        logger.error(f"❌ Error fetching documents by domain: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")