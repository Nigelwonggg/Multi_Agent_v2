from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List

# from ...services import ImageStoreService
# ds_image_store = ImageStoreService()
from ...schemas.image_doc_sch import (
    ImageDocumentResponse, 
    ImageDocumentListResponse,
    ImageDocumentCreate,
    ImageDocumentUpdate,
    FilterOptionsResponse,
    DeleteResponse,
    SearchRequest,
    ImageDocumentsByIdsRequest,
    ImageDocumentsByDomainRequest
)

from ...utils.logging_config import get_logger
router = APIRouter(prefix="/api/image-store", tags=["image-store"])
logger = get_logger("api.routes.image_store")

from app.services.image_store_services import get_image_store_factory

# Get the factory instance
image_factory = get_image_store_factory()

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
        image_store = image_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    options = image_store.get_filter_options(category=category)
    
    return FilterOptionsResponse(
        categories=options["categories"],
        filenames=options["filenames"]
    )

@router.get("/", response_model=ImageDocumentListResponse)
async def get_image_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    category: Optional[str] = Query(None),
    filename: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    domain: Optional[str] = Query("data_science", description="Domain to query (data_science, medical)")
):
    """Get paginated list of image documents with optional filtering"""
    try:
        image_store = image_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    documents, total = image_store.get_documents_paginated(
        page=page,
        page_size=page_size,
        category=category,
        filename=filename,
        search=search
    )
    
    return ImageDocumentListResponse(
        documents=documents,
        total=total,
        page=page,
        page_size=page_size
    )

@router.get("/{doc_id}", response_model=ImageDocumentResponse)
async def get_image_document(
    doc_id: str,
    domain: Optional[str] = Query("data_science", description="Domain to query (data_science, medical)")
):
    """Get a specific image document by doc_id"""
    try:
        image_store = image_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    document = image_store.get_document_by_doc_id(doc_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Image document not found")
    
    return document

@router.post("/", response_model=ImageDocumentResponse)
async def create_image_document(
    document_data: ImageDocumentCreate,
    domain: Optional[str] = Query("data_science", description="Domain to store document in (data_science, medical)")
):
    """Create a new image document"""
    try:
        image_store = image_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if document_data.doc_id:
        existing = image_store.get_document_by_doc_id(document_data.doc_id)
        if existing:
            raise HTTPException(status_code=400, detail="Image document with this doc_id already exists")
    
    doc_id = image_store.add_document(document_data.dict())
    created_doc = image_store.get_document_by_doc_id(doc_id)
    
    if not created_doc:
        raise HTTPException(status_code=500, detail="Failed to create image document")
    
    return created_doc

@router.put("/{doc_id}", response_model=ImageDocumentResponse)
async def update_image_document(
    doc_id: str, 
    document_data: ImageDocumentUpdate,
    domain: Optional[str] = Query("data_science", description="Domain to update document in (data_science, medical)")
):
    """Update an existing image document"""
    try:
        image_store = image_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    logger.info(f"Updating image document {doc_id} in domain {domain}")
    success = image_store.update_document(doc_id, document_data.dict())
    
    if not success:
        raise HTTPException(status_code=404, detail="Image document not found")
    
    updated_doc = image_store.get_document_by_doc_id(doc_id)
    return updated_doc

@router.delete("/{doc_id}", response_model=DeleteResponse)
async def delete_image_document(
    doc_id: str,
    domain: Optional[str] = Query("data_science", description="Domain to delete document from (data_science, medical)")
):
    """Delete an image document"""
    try:
        image_store = image_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    success = image_store.delete_document(doc_id)
    
    if not success:
        logger.error(f"Failed to delete image document {doc_id}")
        raise HTTPException(status_code=404, detail="Image document not found")
    
    logger.info(f"Image document {doc_id} deleted successfully")
    return DeleteResponse(success=True)

@router.get("/search/content", response_model=List[ImageDocumentResponse])
async def search_image_documents_by_query(
    query: str = Query(..., min_length=3),
    limit: int = Query(10, ge=1, le=50),
    domain: Optional[str] = Query("data_science", description="Domain to query (data_science, medical)")
):
    """Search image documents by content using query parameters"""
    try:
        image_store = image_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    documents = image_store.search_documents_by_content(query, limit)
    return documents

@router.post("/search", response_model=List[ImageDocumentResponse])
async def search_image_documents_by_content_post(
    search_request: SearchRequest,
    domain: Optional[str] = Query("data_science", description="Domain to query (data_science, medical)")
):
    """Search image documents using vector similarity"""
    try:
        image_store = image_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    documents = image_store.search_documents_by_content(
        search_request.query, 
        search_request.limit
    )
    return documents

@router.post("/by-ids", response_model=List[ImageDocumentResponse])
async def get_image_documents_by_ids(
    request: ImageDocumentsByIdsRequest,
    domain: Optional[str] = Query("data_science", description="Domain to query (data_science, medical)")
) -> List[ImageDocumentResponse]:
    """Get multiple image documents by their doc_ids (UUIDs)"""
    try:
        image_store = image_factory.get_store_by_name(domain)
        logger.info(f"🖼️ Fetching {len(request.doc_ids)} image documents by IDs in domain {domain}")
        
        # Query documents by doc_ids using the service
        documents = image_store.get_documents_by_ids(request.doc_ids)
        
        logger.info(f"✅ Found {len(documents)} image documents")
        return documents
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error fetching image documents by IDs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch image documents: {str(e)}")

@router.post("/by-domain", response_model=List[ImageDocumentResponse])
async def get_image_documents_by_domain(
    request: ImageDocumentsByDomainRequest
) -> List[ImageDocumentResponse]:
    """Get image documents from multiple domains by their doc_ids"""
    try:
        logger.info(f"🖼️ Fetching image documents by domain: {request.docs_by_domain}")
        
        all_documents = []
        
        for domain, doc_ids in request.docs_by_domain.items():
            if not doc_ids:
                continue
                
            logger.info(f"🔍 Fetching {len(doc_ids)} image documents from domain '{domain}'")
            
            # Get domain-specific image store
            domain_store = image_factory.get_store_by_name(domain)
            if not domain_store:
                logger.warning(f"⚠️ Domain '{domain}' not found, skipping")
                continue
                
            # Query documents by doc_ids for this domain
            domain_documents = domain_store.get_documents_by_ids(doc_ids)
            all_documents.extend(domain_documents)
            
            logger.info(f"✅ Found {len(domain_documents)} image documents from domain '{domain}'")
        
        logger.info(f"🎯 Total fetched: {len(all_documents)} image documents across all domains")
        return all_documents
        
    except Exception as e:
        logger.error(f"❌ Error fetching image documents by domain: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch image documents: {str(e)}")