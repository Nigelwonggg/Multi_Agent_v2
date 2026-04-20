from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "student" # Default to student
    student_id: Optional[str] = None

class UserCreate(UserBase):
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

class AllowedUserBase(BaseModel):
    student_id: str
    name: str
    role: str

class AllowedUserResponse(AllowedUserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
