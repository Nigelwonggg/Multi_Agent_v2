from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.databases.chat_database import get_db
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.attempt import Attempt
from app.models.user_model import Unit, User
from app.schemas.quiz_sch import (
    QuizBase,
    QuizGenerateRequest,
    QuizCreateResponse,
    QuizAttemptBase,
    QuizAttemptResponse,
    QuizAttemptResultsResponse,
    QuizAttemptReviewResponse,
)
from app.services.quiz_service import get_quiz_service, QuizService
from app.api.routes.identity_registry import get_assigned_units_for_user
from app.utils.auth_utils import get_current_user
import json
from typing import Optional
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


def build_quiz_question_snapshot(question_rows: list[Question]) -> list[dict]:
    snapshot = []
    for question_row in question_rows:
        try:
            options = json.loads(question_row.options) if question_row.options else []
        except Exception:
            options = []

        answer: int | str = question_row.answer
        if question_row.type == "mcq":
            try:
                answer = int(question_row.answer)
            except Exception:
                answer = question_row.answer

        snapshot.append(
            {
                "type": question_row.type,
                "question": question_row.question,
                "options": options,
                "answer": answer,
            }
        )

    return snapshot


def normalize_user_answers(user_answers: list[Optional[int | str]], question_count: int) -> list[Optional[int | str]]:
    answers = list(user_answers[:question_count])
    if len(answers) < question_count:
        answers.extend([None] * (question_count - len(answers)))
    return answers


def evaluate_attempt(
    question_snapshot: list[dict],
    user_answers: list[Optional[int | str]],
) -> tuple[int, int]:
    normalized_answers = normalize_user_answers(user_answers, len(question_snapshot))
    correct_count = 0

    for question, user_answer in zip(question_snapshot, normalized_answers):
        if user_answer is None or (isinstance(user_answer, str) and user_answer.strip() == ""):
            continue

        if question["type"] == "mcq":
            if str(user_answer).isdigit() and int(user_answer) == question["answer"]:
                correct_count += 1
            continue

        student_answer = str(user_answer).lower()
        keywords = [
            keyword.strip()
            for keyword in str(question["answer"]).lower().split(",")
            if keyword.strip()
        ]
        if keywords and all(keyword in student_answer for keyword in keywords):
            correct_count += 1

    return correct_count, len(question_snapshot)


def format_answer_for_review(question: dict, answer: Optional[int | str]) -> str | None:
    if answer is None or (isinstance(answer, str) and answer.strip() == ""):
        return None

    if question["type"] == "mcq":
        try:
            answer_index = int(answer)
            options = question.get("options", [])
            if 0 <= answer_index < len(options):
                return str(options[answer_index])
        except (TypeError, ValueError):
            return str(answer)
        return str(answer)

    return str(answer)


def is_answer_correct(question: dict, answer: Optional[int | str]) -> bool:
    if answer is None or (isinstance(answer, str) and answer.strip() == ""):
        return False

    if question["type"] == "mcq":
        try:
            return int(answer) == int(question["answer"])
        except (TypeError, ValueError):
            return False

    student_answer = str(answer).lower()
    keywords = [
        keyword.strip()
        for keyword in str(question["answer"]).lower().split(",")
        if keyword.strip()
    ]
    return bool(keywords) and all(keyword in student_answer for keyword in keywords)


def validate_quiz_payload(payload: QuizBase) -> None:
    if payload.unit_id is None:
        raise HTTPException(
            status_code=400,
            detail="Please choose a unit for this quiz.",
        )

    if payload.time_limit_minutes is not None and payload.time_limit_minutes <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quiz time limit must be greater than zero minutes.",
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


def build_quiz_payload_from_rows(quiz: Quiz, question_rows: list[Question]) -> QuizBase:
    questions_payload = []

    for question_row in question_rows:
        try:
            options = json.loads(question_row.options) if question_row.options else []
        except Exception:
            options = []

        answer: int | str = question_row.answer
        if question_row.type == "mcq":
            try:
                answer = int(question_row.answer)
            except (TypeError, ValueError):
                answer = question_row.answer

        questions_payload.append(
            {
                "type": question_row.type,
                "question": question_row.question,
                "options": options,
                "answer": answer,
            }
        )

    return QuizBase(
        title=quiz.title or "",
        description=quiz.description or "",
        unit_id=quiz.unit_id,
        time_limit_minutes=quiz.time_limit_minutes,
        questions=questions_payload,
    )


def get_user_unit_map(db: Session, current_user: User) -> dict[int, Unit]:
    assigned_units = get_assigned_units_for_user(db, current_user)
    return {unit.id: unit for unit in assigned_units}


def require_lecturer(current_user: User) -> None:
    if current_user.role != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can manage quizzes")


def can_manage_quiz(quiz: Quiz, current_user: User) -> bool:
    return current_user.role == "lecturer" and quiz.created_by_user_id in (None, current_user.id)


def can_edit_quiz(quiz: Quiz, current_user: User) -> bool:
    return can_manage_quiz(quiz, current_user) and not bool(quiz.is_locked)


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

    if not quiz.is_active:
        raise HTTPException(status_code=403, detail="This quiz is still in draft mode.")

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
        quizzes_query = quizzes_query.filter(Quiz.unit_id.in_(unit_ids), Quiz.is_active.is_(True))

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
            "is_active": bool(quiz.is_active),
            "is_locked": bool(quiz.is_locked),
            "time_limit_minutes": quiz.time_limit_minutes,
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
        "is_active": bool(quiz.is_active),
        "is_locked": bool(quiz.is_locked),
        "time_limit_minutes": quiz.time_limit_minutes,
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
            is_active=False,
            is_locked=False,
            time_limit_minutes=payload.time_limit_minutes,
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

    if quiz.is_locked:
        raise HTTPException(status_code=400, detail="Published quizzes cannot be edited.")

    validate_quiz_payload(payload)
    user_units_by_id = get_user_unit_map(db, current_user)
    if payload.unit_id not in user_units_by_id:
        raise HTTPException(status_code=403, detail="You can only assign quizzes to your assigned units.")

    try:
        quiz.title = payload.title
        quiz.description = payload.description
        quiz.unit_id = payload.unit_id
        quiz.created_by_user_id = current_user.id
        quiz.time_limit_minutes = payload.time_limit_minutes

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

    if quiz.is_locked:
        raise HTTPException(status_code=400, detail="Published quizzes cannot be deleted.")
    
    # Delete associated attempts
    db.query(Attempt).filter(Attempt.quiz_id == quiz_id).delete()
    
    # Delete associated questions
    db.query(Question).filter(Question.quiz_id == quiz_id).delete()
    
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted successfully"}


@router.post("/{quiz_id}/activate")
def activate_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_lecturer(current_user)
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if not can_manage_quiz(quiz, current_user):
        raise HTTPException(status_code=403, detail="You can only activate quizzes that you manage.")

    if quiz.is_active:
        raise HTTPException(status_code=400, detail="This quiz is already active.")

    if quiz.unit_id is None:
        raise HTTPException(status_code=400, detail="Please assign a unit before activating this quiz.")

    question_rows = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    if not question_rows:
        raise HTTPException(status_code=400, detail="Add at least one question before activating this quiz.")

    validate_quiz_payload(build_quiz_payload_from_rows(quiz, question_rows))

    quiz.is_active = True
    quiz.is_locked = True
    quiz.created_by_user_id = current_user.id
    db.add(quiz)
    db.commit()

    return {"message": "Quiz activated successfully"}


@router.post("/{quiz_id}/hide")
def hide_quiz_from_students(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_lecturer(current_user)
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if not can_manage_quiz(quiz, current_user):
        raise HTTPException(status_code=403, detail="You can only hide quizzes that you manage.")

    if not quiz.is_locked:
        raise HTTPException(status_code=400, detail="Only published quizzes can be hidden from students.")

    if not quiz.is_active:
        raise HTTPException(status_code=400, detail="This quiz is already hidden from students.")

    quiz.is_active = False
    db.add(quiz)
    db.commit()

    return {"message": "Quiz hidden from students successfully"}


@router.post("/{quiz_id}/show")
def show_quiz_to_students(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_lecturer(current_user)
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if not can_manage_quiz(quiz, current_user):
        raise HTTPException(status_code=403, detail="You can only show quizzes that you manage.")

    if not quiz.is_locked:
        raise HTTPException(status_code=400, detail="Only published quizzes can be shown to students.")

    if quiz.is_active:
        raise HTTPException(status_code=400, detail="This quiz is already visible to students.")

    quiz.is_active = True
    db.add(quiz)
    db.commit()

    return {"message": "Quiz shown to students successfully"}

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
    question_rows = db.query(Question).filter(Question.quiz_id == payload.quiz_id).all()
    question_snapshot = build_quiz_question_snapshot(question_rows)
    normalized_answers = normalize_user_answers(payload.user_answers, len(question_snapshot))
    score, total_questions = evaluate_attempt(question_snapshot, normalized_answers)

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
        score=score,
        total_questions=total_questions,
        answers_json=json.dumps(normalized_answers),
        quiz_snapshot_json=json.dumps(question_snapshot),
    )
    
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


@router.get("/{quiz_id}/attempts", response_model=QuizAttemptResultsResponse)
def get_quiz_attempts(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_lecturer(current_user)

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    user_units_by_id = get_user_unit_map(db, current_user)
    ensure_quiz_access(quiz, current_user, user_units_by_id, allow_unit_access_for_lecturer=True)

    unit = user_units_by_id.get(quiz.unit_id) or db.query(Unit).filter(Unit.id == quiz.unit_id).first()
    attempts = (
        db.query(Attempt, User)
        .join(User, User.id == Attempt.user_id)
        .filter(Attempt.quiz_id == quiz_id)
        .order_by(Attempt.created_at.desc())
        .all()
    )

    attempt_items = []
    for attempt, student in attempts:
        total_questions = attempt.total_questions or 0
        percentage = (attempt.score / total_questions * 100) if total_questions > 0 else 0.0
        attempt_items.append(
            {
                "id": attempt.id,
                "user_id": student.id,
                "student_name": student.full_name or student.email,
                "student_email": student.email,
                "score": attempt.score,
                "total_questions": total_questions,
                "percentage": round(percentage, 1),
                "submitted_at": attempt.created_at.isoformat() if attempt.created_at else None,
            }
        )

    return {
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "quiz_description": quiz.description,
        "unit_id": quiz.unit_id,
        "unit_code": unit.unit_code if unit else None,
        "unit_name": unit.unit_name if unit else None,
        "total_attempts": len(attempt_items),
        "attempts": attempt_items,
    }


@router.get("/{quiz_id}/attempts/{attempt_id}", response_model=QuizAttemptReviewResponse)
def get_quiz_attempt_review(
    quiz_id: int,
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_lecturer(current_user)

    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    user_units_by_id = get_user_unit_map(db, current_user)
    ensure_quiz_access(quiz, current_user, user_units_by_id, allow_unit_access_for_lecturer=True)

    attempt_row = (
        db.query(Attempt, User)
        .join(User, User.id == Attempt.user_id)
        .filter(Attempt.id == attempt_id, Attempt.quiz_id == quiz_id)
        .first()
    )
    if not attempt_row:
        raise HTTPException(status_code=404, detail="Attempt not found")

    attempt, student = attempt_row
    unit = user_units_by_id.get(quiz.unit_id) or db.query(Unit).filter(Unit.id == quiz.unit_id).first()

    snapshot_data = []
    answers_data: list[Optional[int | str]] = []
    review_available = bool(attempt.quiz_snapshot_json and attempt.answers_json)
    review_message = None

    if attempt.quiz_snapshot_json and attempt.answers_json:
        try:
            snapshot_data = json.loads(attempt.quiz_snapshot_json)
            answers_data = json.loads(attempt.answers_json)
        except (TypeError, ValueError):
            review_available = False
            review_message = "This attempt could not be decoded for detailed review."
    else:
        review_message = "Detailed answer review is not available for this older attempt."

    review_questions = []
    if review_available:
        normalized_answers = normalize_user_answers(answers_data, len(snapshot_data))
        for index, (question, answer) in enumerate(zip(snapshot_data, normalized_answers), start=1):
            correct_answer = format_answer_for_review(question, question["answer"]) or "No correct answer recorded"
            review_questions.append(
                {
                    "question_number": index,
                    "type": question["type"],
                    "question": question["question"],
                    "options": question.get("options", []),
                    "student_answer": format_answer_for_review(question, answer),
                    "correct_answer": correct_answer,
                    "is_correct": is_answer_correct(question, answer),
                }
            )

    percentage = round((attempt.score / attempt.total_questions * 100), 1) if attempt.total_questions else 0.0

    return {
        "attempt_id": attempt.id,
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "quiz_description": quiz.description,
        "unit_id": quiz.unit_id,
        "unit_code": unit.unit_code if unit else None,
        "unit_name": unit.unit_name if unit else None,
        "student_name": student.full_name or student.email,
        "student_email": student.email,
        "score": attempt.score,
        "total_questions": attempt.total_questions,
        "percentage": percentage,
        "submitted_at": attempt.created_at.isoformat() if attempt.created_at else None,
        "review_available": review_available,
        "review_message": review_message,
        "questions": review_questions,
    }
