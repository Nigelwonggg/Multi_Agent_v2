import csv
import io
import json
import re

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.databases.chat_database import get_db
from app.models.user_model import Unit, User, VerifiedIdentity
from app.schemas.user_sch import (
    AssignedUnitsUpdateRequest,
    IdentityRegistryDeleteResponse,
    IdentityRegistryEntryResponse,
    IdentityRegistrySummary,
    IdentityRegistryUploadResponse,
    UnitCreateRequest,
    UnitDeleteResponse,
    UnitResponse,
    UnitUploadResponse,
)
from app.utils.auth_utils import get_lecturer_user

router = APIRouter(prefix="/identity-registry", tags=["identity-registry"])

ALLOWED_ROLES = {"student", "lecturer"}


def normalize_institutional_id(raw_value: str) -> str:
    return raw_value.strip().upper()


def normalize_unit_code(raw_value: str) -> str:
    return raw_value.strip().upper()


def normalize_role(raw_value: str) -> str:
    role = raw_value.strip().lower()
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either student or lecturer",
        )
    return role


def normalize_header_cell(raw_value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", raw_value.strip().lower())


def is_header_row(row: list[str]) -> bool:
    if len(row) < 2:
        return False

    first_cell = normalize_header_cell(row[0])
    second_cell = normalize_header_cell(row[1])
    third_cell = normalize_header_cell(row[2]) if len(row) >= 3 else ""

    id_headers = {
        "id",
        "studentid",
        "lecturerid",
        "institutionalid",
        "institutionalidnumber",
    }
    name_headers = {
        "fullname",
        "name",
        "studentname",
        "lecturername",
    }
    unit_headers = {
        "",
        "unit",
        "unitid",
        "unitcode",
        "courseunit",
        "subjectcode",
    }

    return (
        first_cell in id_headers
        and second_cell in name_headers
        and third_cell in unit_headers
    )


def is_unit_header_row(row: list[str]) -> bool:
    if len(row) < 2:
        return False

    first_cell = normalize_header_cell(row[0])
    second_cell = normalize_header_cell(row[1])

    unit_code_headers = {
        "unit",
        "unitcode",
        "unitid",
        "courseunit",
        "subjectcode",
    }
    unit_name_headers = {
        "unitname",
        "name",
        "subjectname",
        "coursename",
    }
    return first_cell in unit_code_headers and second_cell in unit_name_headers


def parse_assigned_unit_ids(raw_value: str | None) -> list[int]:
    if not raw_value:
        return []

    try:
        decoded = json.loads(raw_value)
    except (TypeError, ValueError):
        return []

    if not isinstance(decoded, list):
        return []

    normalized_ids: list[int] = []
    seen: set[int] = set()
    for item in decoded:
        if not isinstance(item, int):
            continue
        if item in seen:
            continue
        seen.add(item)
        normalized_ids.append(item)
    return normalized_ids


def serialize_assigned_unit_ids(unit_ids: list[int]) -> str:
    unique_ids: list[int] = []
    seen: set[int] = set()
    for unit_id in unit_ids:
        if unit_id in seen:
            continue
        seen.add(unit_id)
        unique_ids.append(unit_id)
    return json.dumps(unique_ids)


def to_unit_response(unit: Unit) -> UnitResponse:
    return UnitResponse(
        id=unit.id,
        unit_code=unit.unit_code,
        unit_name=unit.unit_name,
        created_at=unit.created_at,
        updated_at=unit.updated_at,
    )


def build_identity_entry_response(
    identity: VerifiedIdentity,
    units_by_id: dict[int, Unit],
) -> IdentityRegistryEntryResponse:
    assigned_units = [
        to_unit_response(units_by_id[unit_id])
        for unit_id in parse_assigned_unit_ids(identity.assigned_unit_ids)
        if unit_id in units_by_id
    ]
    return IdentityRegistryEntryResponse(
        id=identity.id,
        institutional_id=identity.institutional_id,
        full_name=identity.full_name,
        role=identity.role,
        claimed_by_user_id=identity.claimed_by_user_id,
        assigned_units=assigned_units,
        created_at=identity.created_at,
        updated_at=identity.updated_at,
    )


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


@router.get("/units", response_model=list[UnitResponse])
def list_units(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_lecturer_user),
):
    units = db.query(Unit).order_by(Unit.unit_code.asc()).all()
    return [to_unit_response(unit) for unit in units]


@router.post("/units", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
def create_unit(
    payload: UnitCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_lecturer_user),
):
    unit_code = normalize_unit_code(payload.unit_code)
    unit_name = payload.unit_name.strip()

    if not unit_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit code is required",
        )
    if not unit_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit name is required",
        )

    existing = db.query(Unit).filter(Unit.unit_code == unit_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A unit with this code already exists",
        )

    unit = Unit(unit_code=unit_code, unit_name=unit_name)
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return to_unit_response(unit)


@router.put("/units/{unit_id}", response_model=UnitResponse)
def update_unit(
    unit_id: int,
    payload: UnitCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_lecturer_user),
):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    unit_code = normalize_unit_code(payload.unit_code)
    unit_name = payload.unit_name.strip()

    if not unit_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit code is required",
        )
    if not unit_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit name is required",
        )

    existing = (
        db.query(Unit)
        .filter(Unit.unit_code == unit_code, Unit.id != unit_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A unit with this code already exists",
        )

    unit.unit_code = unit_code
    unit.unit_name = unit_name
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return to_unit_response(unit)


@router.post("/units/upload-csv", response_model=UnitUploadResponse)
async def upload_units_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_lecturer_user),
):
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

        raw_unit_code = row[0].strip()
        raw_unit_name = row[1].strip()

        if row_index == 1 and is_unit_header_row(row):
            continue

        if not raw_unit_code or not raw_unit_name:
            skipped_count += 1
            continue

        processed_rows += 1
        unit_code = normalize_unit_code(raw_unit_code)
        unit_name = raw_unit_name

        existing = db.query(Unit).filter(Unit.unit_code == unit_code).first()
        if existing:
            existing.unit_name = unit_name
            db.add(existing)
            updated_count += 1
        else:
            db.add(Unit(unit_code=unit_code, unit_name=unit_name))
            created_count += 1

    db.commit()

    return UnitUploadResponse(
        created_count=created_count,
        updated_count=updated_count,
        skipped_count=skipped_count,
        total_processed=processed_rows,
    )


@router.delete("/units/{unit_id}", response_model=UnitDeleteResponse)
def delete_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_lecturer_user),
):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    identities = db.query(VerifiedIdentity).all()
    for identity in identities:
        assigned_ids = parse_assigned_unit_ids(identity.assigned_unit_ids)
        if unit_id not in assigned_ids:
            continue
        identity.assigned_unit_ids = serialize_assigned_unit_ids(
            [assigned_id for assigned_id in assigned_ids if assigned_id != unit_id]
        )
        db.add(identity)

    deleted_unit_code = unit.unit_code
    deleted_unit_id = unit.id
    db.delete(unit)
    db.commit()

    return UnitDeleteResponse(
        deleted_unit_id=deleted_unit_id,
        deleted_unit_code=deleted_unit_code,
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
    units_by_id = {unit.id: unit for unit in db.query(Unit).all()}
    return [build_identity_entry_response(entry, units_by_id) for entry in entries]


@router.put("/entries/{identity_id}/assigned-units", response_model=IdentityRegistryEntryResponse)
def update_identity_assigned_units(
    identity_id: int,
    payload: AssignedUnitsUpdateRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_lecturer_user),
):
    identity = db.query(VerifiedIdentity).filter(VerifiedIdentity.id == identity_id).first()
    if not identity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registry entry not found",
        )

    unique_unit_ids: list[int] = []
    seen: set[int] = set()
    for unit_id in payload.unit_ids:
        if unit_id in seen:
            continue
        seen.add(unit_id)
        unique_unit_ids.append(unit_id)

    units = db.query(Unit).filter(Unit.id.in_(unique_unit_ids)).all() if unique_unit_ids else []
    units_by_id = {unit.id: unit for unit in units}
    missing_unit_ids = [unit_id for unit_id in unique_unit_ids if unit_id not in units_by_id]
    if missing_unit_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown unit IDs: {', '.join(str(unit_id) for unit_id in missing_unit_ids)}",
        )

    identity.assigned_unit_ids = serialize_assigned_unit_ids(unique_unit_ids)
    db.add(identity)
    db.commit()
    db.refresh(identity)

    return build_identity_entry_response(identity, units_by_id)


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
        raw_unit_code = row[2].strip() if len(row) >= 3 else ""

        if row_index == 1 and is_header_row(row):
            continue

        if not raw_id or not raw_name:
            skipped_count += 1
            continue

        processed_rows += 1
        institutional_id = normalize_institutional_id(raw_id)
        legacy_unit_code = normalize_unit_code(raw_unit_code) if raw_unit_code else None

        existing = (
            db.query(VerifiedIdentity)
            .filter(VerifiedIdentity.institutional_id == institutional_id)
            .first()
        )

        if existing:
            existing.full_name = raw_name
            existing.role = normalized_role
            existing.uploaded_by_user_id = current_user.id
            if legacy_unit_code:
                existing.unit_id = legacy_unit_code
            db.add(existing)
            updated_count += 1
        else:
            db.add(
                VerifiedIdentity(
                    institutional_id=institutional_id,
                    full_name=raw_name,
                    unit_id=legacy_unit_code,
                    assigned_unit_ids="[]",
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


@router.delete("/entries/{identity_id}", response_model=IdentityRegistryDeleteResponse)
def delete_identity_registry_entry(
    identity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_lecturer_user),
):
    identity = (
        db.query(VerifiedIdentity)
        .filter(VerifiedIdentity.id == identity_id)
        .first()
    )
    if not identity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registry entry not found",
        )

    claimed_user = None
    if identity.claimed_by_user_id is not None:
        claimed_user = (
            db.query(User)
            .filter(User.id == identity.claimed_by_user_id)
            .first()
        )

    if claimed_user and claimed_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete the account you are currently signed in with",
        )

    deleted_user_full_name = claimed_user.full_name if claimed_user else None
    deleted_user_account = claimed_user is not None

    if claimed_user:
        db.query(VerifiedIdentity).filter(
            VerifiedIdentity.uploaded_by_user_id == claimed_user.id
        ).update(
            {VerifiedIdentity.uploaded_by_user_id: None},
            synchronize_session=False,
        )
        db.query(VerifiedIdentity).filter(
            VerifiedIdentity.claimed_by_user_id == claimed_user.id
        ).update(
            {VerifiedIdentity.claimed_by_user_id: None},
            synchronize_session=False,
        )
        db.delete(claimed_user)

    deleted_identity_id = identity.id
    deleted_institutional_id = identity.institutional_id
    db.delete(identity)
    db.commit()

    return IdentityRegistryDeleteResponse(
        deleted_identity_id=deleted_identity_id,
        deleted_institutional_id=deleted_institutional_id,
        deleted_user_account=deleted_user_account,
        deleted_user_full_name=deleted_user_full_name,
    )
