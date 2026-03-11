from pydantic import BaseModel
from typing import Optional, List

class TextDocumentBase(BaseModel):
    doc_id: str
    summary_text: str
    raw_text: str
    category: Optional[str] = ""
    filename: Optional[str] = ""

class TextDocumentCreate(BaseModel):
    doc_id: Optional[str] = None  # Will be auto-generated if not provided
    summary_text: str
    raw_text: str
    category: Optional[str] = ""
    filename: Optional[str] = ""
    page_number: Optional[int] = None  # Add page number support

class TextDocumentUpdate(BaseModel):
    summary_text: str
    raw_text: str
    category: Optional[str] = ""
    filename: Optional[str] = ""
    page_number: Optional[int] = None  # Add page number support

class TextDocumentResponse(BaseModel):
    id: int  # Frontend position index
    doc_id: str
    summary_text: str
    raw_text: str
    category: str
    filename: str  # Just the filename
    page_number: Optional[int] = None  # Page number as int or None

class TextDocumentListResponse(BaseModel):
    documents: List[TextDocumentResponse]
    total: int
    page: int
    page_size: int

class FilterOptionsResponse(BaseModel):
    categories: List[str]
    filenames: List[str]

class DeleteResponse(BaseModel):
    success: bool
    message: str = "Document deleted successfully"

class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 10

# Add this request model
class DocumentsByIdsRequest(BaseModel):
    doc_ids: List[str]

# Domain-aware document retrieval
class DocumentsByDomainRequest(BaseModel):
    docs_by_domain: dict  # {domain: [doc_id1, doc_id2, ...]}