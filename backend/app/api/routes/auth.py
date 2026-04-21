import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

from app.databases.chat_database import get_db
from app.models.user_model import User, AllowedUser
from app.schemas.user_sch import UserCreate, UserLogin, UserResponse, Token, AllowedUserResponse
from app.utils.auth_utils import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserResponse)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    is_test_account = user_in.email in ["admin@test.com", "student@test.com"]

    # Check if student_id is allowed (skip for test accounts)
    allowed = None
    if not is_test_account:
        allowed = db.query(AllowedUser).filter(AllowedUser.student_id == user_in.student_id).first()
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID not authorized for signup"
            )

        # Check if student_id already registered
        existing_id = db.query(User).filter(User.student_id == user_in.student_id).first()
        if existing_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID already registered"
            )

    # Check if email already registered
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    hashed_pw = get_password_hash(user_in.password)

    role = "student"
    full_name = user_in.full_name

    if is_test_account:
        role = "lecturer" if user_in.email == "admin@test.com" else "student"
    elif allowed:
        role = allowed.role
        full_name = user_in.full_name or allowed.name

    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pw,
        full_name=full_name,
        role=role, # Role is dictated by AllowedUser table or test account default
        student_id=user_in.student_id if not is_test_account else None,
        security_question=user_in.security_question,
        security_answer=user_in.security_answer
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/verify-id/{student_id}")
def verify_id(student_id: str, db: Session = Depends(get_db)):
    allowed = db.query(AllowedUser).filter(AllowedUser.student_id == student_id).first()
    if not allowed:
        raise HTTPException(status_code=404, detail="ID not found in allowed list")
    
    # Check if already registered
    existing_user = db.query(User).filter(User.student_id == student_id).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="ID already registered")
    
    return {"allowed": True, "name": allowed.name, "role": allowed.role}

@router.post("/upload-allowed-users")
async def upload_allowed_users(
    role: str,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can upload allowed users")

    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.reader(io.StringIO(decoded))
    
    added_count = 0
    for row in reader:
        if len(row) < 2:
            continue
        uid, name = row[0], row[1]
        
        # Check if already exists in allowed_users
        existing = db.query(AllowedUser).filter(AllowedUser.student_id == uid).first()
        if existing:
            existing.name = name
            existing.role = role
        else:
            new_allowed = AllowedUser(student_id=uid, name=name, role=role)
            db.add(new_allowed)
        added_count += 1
    
    db.commit()
    return {"message": f"Successfully processed {added_count} users"}
