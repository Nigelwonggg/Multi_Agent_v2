from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.databases.chat_database import get_db
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.attempt import Attempt
from app.models.user_model import Unit, User
from app.schemas.quiz_sch import QuizBase, QuizGenerateRequest, QuizCreateResponse, QuizAttemptBase, QuizAttemptResponse
from app.services.quiz_service import get_quiz_service, QuizService
from app.api.routes.identity_registry import get_assigned_units_for_user
from app.utils.auth_utils import get_current_user
import json
from typing import Optional
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


def validate_quiz_payload(payload: QuizBase) -> None:
    if payload.unit_id is None:
        raise HTTPException(
            status_code=400,
            detail="Please choose a unit for this quiz.",
        )

    if len(payload.questions) == 0:
        raise HTTPException(
            status_code=400,
            detail="A quiz must contain at least one question.",
        )

    for index, question in enumerate(payload.questions, start=1):
        if question.type == "short":
            if not isinstance(question.answer, str) or not question.answer.strip():
                raise HTTPException(
                    status_code=400,
                    detail=f"Question {index} must include a correct short answer.",
                )
            continue

        if question.type != "mcq":
            continue

        filled_options = [option.strip() for option in question.options if option.strip()]
        selected_answer = question.answer

        if not isinstance(selected_answer, int):
            raise HTTPException(
                status_code=400,
                detail=f"Question {index} must have a valid selected correct answer.",
            )

        if len(filled_options) < 2:
            raise HTTPException(
                status_code=400,
                detail=f"Question {index} must include at least two filled options.",
            )

        if selected_answer < 0 or selected_answer >= len(question.options):
            raise HTTPException(
                status_code=400,
                detail=f"Question {index} has an invalid correct answer selection.",
            )

        if not question.options[selected_answer].strip():
            raise HTTPException(
                status_code=400,
                detail=f"Question {index} must select a non-empty option as the correct answer.",
            )


def get_user_unit_map(db: Session, current_user: User) -> dict[int, Unit]:
    assigned_units = get_assigned_units_for_user(db, current_user)
    return {unit.id: unit for unit in assigned_units}


def require_lecturer(current_user: User) -> None:
    if current_user.role != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can manage quizzes")


def can_manage_quiz(quiz: Quiz, current_user: User) -> bool:
    return current_user.role == "lecturer" and quiz.created_by_user_id in (None, current_user.id)


def ensure_quiz_access(
    quiz: Quiz,
    current_user: User,
    user_units_by_id: dict[int, Unit],
    *,
    allow_unit_access_for_lecturer: bool = False,
) -> None:
    if current_user.role == "lecturer":
        owns_quiz = quiz.created_by_user_id == current_user.id
        is_legacy_quiz = quiz.created_by_user_id is None
        can_access_unit = allow_unit_access_for_lecturer and quiz.unit_id in user_units_by_id
        if not owns_quiz and not is_legacy_quiz and not can_access_unit:
            raise HTTPException(status_code=403, detail="You do not have access to this quiz")
        return

    if quiz.unit_id not in user_units_by_id:
        raise HTTPException(status_code=403, detail="You do not have access to this quiz")

@router.get("")
def get_quizzes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_units_by_id = get_user_unit_map(db, current_user)
    quizzes_query = db.query(Quiz)

    if current_user.role == "lecturer":
        unit_ids = list(user_units_by_id.keys())
        quizzes_query = quizzes_query.filter(
            or_(
                Quiz.created_by_user_id == current_user.id,
                Quiz.created_by_user_id.is_(None),
                Quiz.unit_id.in_(unit_ids) if unit_ids else False,
            )
        )
    else:
        unit_ids = list(user_units_by_id.keys())
        if not unit_ids:
            return []
        quizzes_query = quizzes_query.filter(Quiz.unit_id.in_(unit_ids))

    quizzes = quizzes_query.order_by(Quiz.id.desc()).all()
    result = []
    for quiz in quizzes:
        unit = user_units_by_id.get(quiz.unit_id)
        quiz_data = {
            "id": quiz.id,
            "title": quiz.title,
            "description": quiz.description,
            "completed": False,
            "unit_id": quiz.unit_id,
            "unit_code": unit.unit_code if unit else None,
            "unit_name": unit.unit_name if unit else None,
            "can_manage": can_manage_quiz(quiz, current_user),
        }
        
        if current_user.role != "lecturer":
            attempt = db.query(Attempt).filter(
                Attempt.quiz_id == quiz.id,
                Attempt.user_id == current_user.id
            ).first()
            if attempt:
                quiz_data["completed"] = True
                quiz_data["score"] = attempt.score
                quiz_data["total_questions"] = attempt.total_questions
                
        result.append(quiz_data)
        
    return result

@router.get("/{quiz_id}")
def get_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    user_units_by_id = get_user_unit_map(db, current_user)
    ensure_quiz_access(quiz, current_user, user_units_by_id, allow_unit_access_for_lecturer=True)

    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    unit = user_units_by_id.get(quiz.unit_id) or db.query(Unit).filter(Unit.id == quiz.unit_id).first()

    quiz_data = {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "unit_id": quiz.unit_id,
        "unit_code": unit.unit_code if unit else None,
        "unit_name": unit.unit_name if unit else None,
        "can_manage": can_manage_quiz(quiz, current_user),
        "questions": []
    }
    
    for q in questions:
        try:
            options = json.loads(q.options) if q.options else []
        except:
            options = []
            
        answer = q.answer
        if q.type == "mcq":
            try:
                answer = int(q.answer)
            except:
                pass

        quiz_data["questions"].append({
            "type": q.type,
            "question": q.question,
            "options": options,
            "answer": answer
        })
        
    return quiz_data

@router.post("", response_model=QuizCreateResponse)
def create_quiz(
    payload: QuizBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_lecturer(current_user)
    validate_quiz_payload(payload)
    user_units_by_id = get_user_unit_map(db, current_user)
    if payload.unit_id not in user_units_by_id:
        raise HTTPException(status_code=403, detail="You can only create quizzes for your assigned units.")

    try:
        quiz = Quiz(
            title=payload.title,
            description=payload.description,
            unit_id=payload.unit_id,
            created_by_user_id=current_user.id,
        )

        db.add(quiz)
        db.flush()

        for q in payload.questions:
            question = Question(
                quiz_id=quiz.id,
                type=q.type,
                question=q.question,
                options=json.dumps(q.options),
                answer=str(q.answer)
            )
            db.add(question)

        db.commit()
        db.refresh(quiz)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save quiz: {exc}") from exc

    return {
        "message": "Quiz saved successfully",
        "quiz_id": quiz.id
    }

@router.post("/generate", response_model=QuizBase)
def generate_quiz(
    request: QuizGenerateRequest,
    quiz_service: QuizService = Depends(get_quiz_service)
):
    try:
        return quiz_service.generate_quiz(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{quiz_id}")
def update_quiz(
    quiz_id: int,
    payload: QuizBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_lecturer(current_user)
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.created_by_user_id not in (None, current_user.id):
        raise HTTPException(status_code=403, detail="You can only edit quizzes that you created.")

    validate_quiz_payload(payload)
    user_units_by_id = get_user_unit_map(db, current_user)
    if payload.unit_id not in user_units_by_id:
        raise HTTPException(status_code=403, detail="You can only assign quizzes to your assigned units.")

    try:
        quiz.title = payload.title
        quiz.description = payload.description
        quiz.unit_id = payload.unit_id
        quiz.created_by_user_id = current_user.id

        db.query(Question).filter(Question.quiz_id == quiz_id).delete()

        for q in payload.questions:
            question = Question(
                quiz_id=quiz_id,
                type=q.type,
                question=q.question,
                options=json.dumps(q.options),
                answer=str(q.answer)
            )
            db.add(question)

        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update quiz: {exc}") from exc

    return {"message": "Quiz updated successfully"}

@router.delete("/{quiz_id}")
def delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_lecturer(current_user)
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.created_by_user_id not in (None, current_user.id):
        raise HTTPException(status_code=403, detail="You can only delete quizzes that you created.")
    
    # Delete associated attempts
    db.query(Attempt).filter(Attempt.quiz_id == quiz_id).delete()
    
    # Delete associated questions
    db.query(Question).filter(Question.quiz_id == quiz_id).delete()
    
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted successfully"}

@router.post("/submit", response_model=QuizAttemptResponse)
def submit_quiz(
    payload: QuizAttemptBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit quiz attempts")

    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only submit attempts for your own account")

    quiz = db.query(Quiz).filter(Quiz.id == payload.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    user_units_by_id = get_user_unit_map(db, current_user)
    ensure_quiz_access(quiz, current_user, user_units_by_id)

    # Check if attempt already exists
    existing = db.query(Attempt).filter(
        Attempt.quiz_id == payload.quiz_id,
        Attempt.user_id == payload.user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=403, detail="Quiz already submitted")
        
    attempt = Attempt(
        user_id=payload.user_id,
        quiz_id=payload.quiz_id,
        score=payload.score,
        total_questions=payload.total_questions
    )
    
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt
