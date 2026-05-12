from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "student" # Default to student

class UserCreate(UserBase):
    institutional_id: str
    password: str
    security_question: str
    security_answer: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    security_question: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None


class IdentityVerificationRequest(BaseModel):
    institutional_id: str


class IdentityVerificationResponse(BaseModel):
    institutional_id: str
    full_name: str
    role: str
    claimed: bool = False


class IdentityRegistryEntryResponse(BaseModel):
    id: int
    institutional_id: str
    full_name: str
    role: str
    claimed_by_user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IdentityRegistrySummary(BaseModel):
    total_count: int
    student_count: int
    lecturer_count: int
    claimed_count: int
    unclaimed_count: int


class IdentityRegistryUploadResponse(BaseModel):
    created_count: int
    updated_count: int
    skipped_count: int
    total_processed: int
