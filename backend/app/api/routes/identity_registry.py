import csv
import io

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.databases.chat_database import get_db
from app.models.user_model import User, VerifiedIdentity
from app.schemas.user_sch import (
    IdentityRegistryEntryResponse,
    IdentityRegistrySummary,
    IdentityRegistryUploadResponse,
)
from app.utils.auth_utils import get_lecturer_user

router = APIRouter(prefix="/identity-registry", tags=["identity-registry"])

ALLOWED_ROLES = {"student", "lecturer"}


def normalize_institutional_id(raw_value: str) -> str:
    return raw_value.strip().upper()


def normalize_role(raw_value: str) -> str:
    role = raw_value.strip().lower()
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either student or lecturer",
        )
    return role


@router.get("/summary", response_model=IdentityRegistrySummary)
def get_identity_registry_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_lecturer_user),
):
    total_count = db.query(func.count(VerifiedIdentity.id)).scalar() or 0
    student_count = (
        db.query(func.count(VerifiedIdentity.id))
        .filter(VerifiedIdentity.role == "student")
        .scalar()
        or 0
    )
    lecturer_count = (
        db.query(func.count(VerifiedIdentity.id))
        .filter(VerifiedIdentity.role == "lecturer")
        .scalar()
        or 0
    )
    claimed_count = (
        db.query(func.count(VerifiedIdentity.id))
        .filter(VerifiedIdentity.claimed_by_user_id.isnot(None))
        .scalar()
        or 0
    )
    unclaimed_count = total_count - claimed_count

    return IdentityRegistrySummary(
        total_count=total_count,
        student_count=student_count,
        lecturer_count=lecturer_count,
        claimed_count=claimed_count,
        unclaimed_count=unclaimed_count,
    )


@router.get("/entries", response_model=list[IdentityRegistryEntryResponse])
def list_identity_registry_entries(
    role: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_lecturer_user),
):
    query = db.query(VerifiedIdentity)

    if role:
        query = query.filter(VerifiedIdentity.role == normalize_role(role))

    safe_limit = max(1, min(limit, 500))
    entries = (
        query.order_by(VerifiedIdentity.updated_at.desc(), VerifiedIdentity.id.desc())
        .limit(safe_limit)
        .all()
    )
    return entries


@router.post("/upload-csv", response_model=IdentityRegistryUploadResponse)
async def upload_identity_registry_csv(
    file: UploadFile = File(...),
    role: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_lecturer_user),
):
    normalized_role = normalize_role(role)

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a CSV file",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded CSV file is empty",
        )

    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file must be UTF-8 encoded",
        ) from exc

    reader = csv.reader(io.StringIO(decoded))

    created_count = 0
    updated_count = 0
    skipped_count = 0
    processed_rows = 0

    for row_index, row in enumerate(reader, start=1):
        if not row or all(not cell.strip() for cell in row):
            continue

        if len(row) < 2:
            skipped_count += 1
            continue

        raw_id = row[0].strip()
        raw_name = row[1].strip()

        if row_index == 1 and raw_id.lower() in {"id", "student id", "lecturer id", "institutional id"}:
            continue

        if not raw_id or not raw_name:
            skipped_count += 1
            continue

        processed_rows += 1
        institutional_id = normalize_institutional_id(raw_id)

        existing = (
            db.query(VerifiedIdentity)
            .filter(VerifiedIdentity.institutional_id == institutional_id)
            .first()
        )

        if existing:
            existing.full_name = raw_name
            existing.role = normalized_role
            existing.uploaded_by_user_id = current_user.id
            db.add(existing)
            updated_count += 1
        else:
            db.add(
                VerifiedIdentity(
                    institutional_id=institutional_id,
                    full_name=raw_name,
                    role=normalized_role,
                    uploaded_by_user_id=current_user.id,
                )
            )
            created_count += 1

    db.commit()

    return IdentityRegistryUploadResponse(
        created_count=created_count,
        updated_count=updated_count,
        skipped_count=skipped_count,
        total_processed=processed_rows,
    )
