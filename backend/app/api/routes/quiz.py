from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.databases.chat_database import get_db
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.attempt import Attempt
from app.schemas.quiz_sch import QuizBase, QuizGenerateRequest, QuizCreateResponse, QuizAttemptBase, QuizAttemptResponse
from app.services.quiz_service import get_quiz_service, QuizService
import json
from typing import Optional
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


def validate_quiz_payload(payload: QuizBase) -> None:
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

@router.get("")
def get_quizzes(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).all()
    
    result = []
    for quiz in quizzes:
        quiz_data = {
            "id": quiz.id,
            "title": quiz.title,
            "description": quiz.description,
            "completed": False
        }
        
        if user_id:
            attempt = db.query(Attempt).filter(
                Attempt.quiz_id == quiz.id,
                Attempt.user_id == user_id
            ).first()
            if attempt:
                quiz_data["completed"] = True
                quiz_data["score"] = attempt.score
                quiz_data["total_questions"] = attempt.total_questions
                
        result.append(quiz_data)
        
    return result

@router.get("/{quiz_id}")
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    
    quiz_data = {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
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
def create_quiz(payload: QuizBase, db: Session = Depends(get_db)):
    validate_quiz_payload(payload)

    try:
        quiz = Quiz(
            title=payload.title,
            description=payload.description
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
def update_quiz(quiz_id: int, payload: QuizBase, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    validate_quiz_payload(payload)

    try:
        quiz.title = payload.title
        quiz.description = payload.description

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
def delete_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Delete associated attempts
    db.query(Attempt).filter(Attempt.quiz_id == quiz_id).delete()
    
    # Delete associated questions
    db.query(Question).filter(Question.quiz_id == quiz_id).delete()
    
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted successfully"}

@router.post("/submit", response_model=QuizAttemptResponse)
def submit_quiz(payload: QuizAttemptBase, db: Session = Depends(get_db)):
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
