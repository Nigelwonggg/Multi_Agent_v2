from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Query, UploadFile
from typing import Optional, List
from pathlib import Path

from app.services.text_store_services import get_text_store_factory
from app.services.pdf_ingestion_service import get_pdf_ingestion_service
from ...schemas.text_doc_sch import (
    TextDocumentResponse, 
    TextDocumentListResponse,
    TextDocumentCreate,
    TextDocumentUpdate,
    FilterOptionsResponse,
    DeleteResponse,
    SearchRequest,
    DocumentsByIdsRequest,
    DocumentsByDomainRequest,
    PdfUploadResponse,
    PdfUploadJobResponse,
)

from ...utils.logging_config import get_logger

router = APIRouter(prefix="/api/text-store", tags=["text-documents"])
logger = get_logger("api.routes.text-store")

# Get the factory instance
text_factory = get_text_store_factory()
pdf_ingestion_service = get_pdf_ingestion_service()

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
async def create_text_document(
    document_data: TextDocumentCreate,
    domain: Optional[str] = Query("data_science", description="Domain to store document in (data_science, medical)"),
):
    """Create a new text document"""
    try:
        text_store = text_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if document_data.doc_id:
        existing = text_store.get_document_by_doc_id(document_data.doc_id)
        if existing:
            raise HTTPException(status_code=400, detail="Document with this doc_id already exists")
    
    doc_id = text_store.add_document(document_data.dict())
    
    # Return the created document
    created_doc = text_store.get_document_by_doc_id(doc_id)
    if not created_doc:
        raise HTTPException(status_code=500, detail="Failed to create document")
    
    return created_doc

@router.put("/{doc_id}", response_model=TextDocumentResponse)
async def update_text_document(
    doc_id: str,
    document_data: TextDocumentUpdate,
    domain: Optional[str] = Query("data_science", description="Domain to update document in (data_science, medical)"),
):
    """Update an existing text document"""
    try:
        text_store = text_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    success = text_store.update_document(doc_id, document_data.dict())
    
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Return the updated document
    updated_doc = text_store.get_document_by_doc_id(doc_id)
    return updated_doc

@router.delete("/{doc_id}", response_model=DeleteResponse)
async def delete_text_document(
    doc_id: str,
    domain: Optional[str] = Query("data_science", description="Domain to delete document from (data_science, medical)"),
):
    """Delete a text document"""
    try:
        text_store = text_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    success = text_store.delete_document(doc_id)
    
    if not success:
        logger.error(f"Failed to delete document {doc_id}")
        raise HTTPException(status_code=404, detail="Document not found")
    
    logger.info(f"Document {doc_id} deleted successfully")
    return DeleteResponse(success=True)

@router.post("/search", response_model=List[TextDocumentResponse])
async def search_documents_by_content(
    search_request: SearchRequest,
    domain: Optional[str] = Query("data_science", description="Domain to query (data_science, medical)"),
):
    """Search documents using vector similarity"""
    try:
        text_store = text_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    documents = text_store.search_documents_by_content(
        search_request.query, 
        search_request.limit
    )
    
    return documents

# Alternative search endpoint with query parameters
@router.get("/search/content", response_model=List[TextDocumentResponse])
async def search_documents_by_query(
    query: str = Query(..., min_length=3),
    limit: int = Query(10, ge=1, le=50),
    domain: Optional[str] = Query("data_science", description="Domain to query (data_science, medical)"),
):
    """Search documents by content using query parameters"""
    try:
        text_store = text_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    documents = text_store.search_documents_by_content(query, limit)
    return documents


@router.post("/by-ids", response_model=List[TextDocumentResponse])
async def get_documents_by_ids(
    request: DocumentsByIdsRequest,
    domain: Optional[str] = Query("data_science", description="Domain to query (data_science, medical)")
) -> List[TextDocumentResponse]:
    """Get multiple documents by their doc_ids (UUIDs)"""
    try:
        text_store = text_factory.get_store_by_name(domain)
        logger.info(f"📋 Fetching {len(request.doc_ids)} documents by IDs")
        
        # Query documents by doc_ids using the service
        documents = text_store.get_documents_by_ids(request.doc_ids)
        
        logger.info(f"✅ Found {len(documents)} documents")
        return documents
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error fetching documents by IDs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")


@router.post("/upload-pdf", response_model=PdfUploadResponse)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    domain: str = Form("data_science"),
    category: str = Form("general"),
):
    """Upload a PDF and ingest extracted text into the selected text store domain."""
    if file.content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Uploaded file must have a .pdf extension")

    try:
        text_factory.get_store_by_name(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    file_bytes = await file.read()
    max_bytes = 20 * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail="PDF exceeds max upload size of 20MB")

    safe_filename = Path(file.filename).name
    job_id = pdf_ingestion_service.create_job(safe_filename, domain, category)
    temp_file_path = pdf_ingestion_service.save_upload_to_temp_file(file_bytes, suffix=".pdf")

    def process_and_cleanup() -> None:
        try:
            pdf_ingestion_service.process_pdf_file(
                file_path=temp_file_path,
                filename=safe_filename,
                domain=domain,
                category=category,
                job_id=job_id,
            )
        finally:
            pdf_ingestion_service.cleanup_temp_file(temp_file_path)

    background_tasks.add_task(process_and_cleanup)
    return PdfUploadResponse(
        job_id=job_id,
        status="queued",
        message="PDF upload accepted. Processing has started in the background.",
    )


@router.get("/upload-jobs/{job_id}", response_model=PdfUploadJobResponse)
async def get_pdf_upload_job_status(job_id: str):
    """Get status for an async PDF upload job."""
    job = pdf_ingestion_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Upload job not found")

    return PdfUploadJobResponse(**job)


@router.delete("/upload-jobs/{job_id}")
async def cancel_pdf_upload_job(job_id: str):
    """Cancel a running or queued PDF upload job."""
    success = pdf_ingestion_service.cancel_job(job_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Job cannot be cancelled (already finished, cancelled, or not found)",
        )
    return {"message": "Job cancellation requested"}

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