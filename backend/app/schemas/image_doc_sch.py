from pydantic import BaseModel, validator
from typing import Optional, List, Union

class ImageDocumentBase(BaseModel):
    doc_id: str
    image_summary: str
    image_base64: str
    category: Optional[str] = ""
    filename: Optional[str] = ""

class ImageDocumentCreate(BaseModel):
    doc_id: Optional[str] = None  # Will be auto-generated if not provided
    image_summary: str
    image_base64: str
    category: Optional[str] = ""
    filename: Optional[str] = ""
    page_number: Optional[Union[int, str]] = None
    
    @validator('page_number', pre=True)
    def validate_page_number(cls, v):
        if v is None or v == "":
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError("Page number must be a valid integer")

class ImageDocumentUpdate(BaseModel):
    image_summary: str
    image_base64: str
    category: Optional[str] = ""
    filename: Optional[str] = ""
    page_number: Optional[Union[int, str]] = None
    
    @validator('page_number', pre=True)
    def validate_page_number(cls, v):
        if v is None or v == "":
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError("Page number must be a valid integer")

class ImageDocumentResponse(BaseModel):
    id: int  # Frontend position index
    doc_id: str
    image_summary: str
    image_base64: str
    category: str
    filename: str
    page_number: Optional[int] = None

class ImageDocumentListResponse(BaseModel):
    documents: List[ImageDocumentResponse]
    total: int
    page: int
    page_size: int

class FilterOptionsResponse(BaseModel):
    categories: List[str]
    filenames: List[str]

class DeleteResponse(BaseModel):
    success: bool
    message: str = "Image document deleted successfully"

class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 10

class ImageDocumentsByIdsRequest(BaseModel):
    doc_ids: List[str]

# Domain-aware image document retrieval
class ImageDocumentsByDomainRequest(BaseModel):
    docs_by_domain: dict  # {domain: [doc_id1, doc_id2, ...]}