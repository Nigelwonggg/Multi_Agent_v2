from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.databases.chat_database import get_db
from app.models.user_model import User, VerifiedIdentity
from app.schemas.user_sch import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    IdentityVerificationRequest,
    IdentityVerificationResponse,
)
from app.utils.auth_utils import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["auth"])


def normalize_institutional_id(raw_value: str) -> str:
    return raw_value.strip().upper()


@router.post("/verify-id", response_model=IdentityVerificationResponse)
def verify_identity(payload: IdentityVerificationRequest, db: Session = Depends(get_db)):
    institutional_id = normalize_institutional_id(payload.institutional_id)
    identity = (
        db.query(VerifiedIdentity)
        .filter(VerifiedIdentity.institutional_id == institutional_id)
        .first()
    )
    if not identity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ID not found in the verified registry",
        )

    if identity.claimed_by_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This ID has already been used to create an account",
        )

    return IdentityVerificationResponse(
        institutional_id=identity.institutional_id,
        full_name=identity.full_name,
        role=identity.role,
        claimed=False,
    )

@router.post("/signup", response_model=UserResponse)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    institutional_id = normalize_institutional_id(user_in.institutional_id)
    identity = (
        db.query(VerifiedIdentity)
        .filter(VerifiedIdentity.institutional_id == institutional_id)
        .first()
    )
    if not identity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID verification is required before sign up",
        )

    if identity.claimed_by_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This ID has already been used to create an account",
        )

    if user_in.role and user_in.role != identity.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This ID is registered as a {identity.role}. Please use the correct role.",
        )

    # Create new user
    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pw,
        full_name=identity.full_name,
        role=identity.role,
        security_question=user_in.security_question,
        security_answer=user_in.security_answer
    )
    db.add(new_user)
    db.flush()
    identity.claimed_by_user_id = new_user.id
    db.add(identity)
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
