from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.databases.chat_database import get_db
from app.models.quiz import Quiz
from app.models.question import Question
import json

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])

@router.get("")
def get_quizzes(db: Session = Depends(get_db)):
    return db.query(Quiz).all()

@router.post("")
def create_quiz(payload: dict, db: Session = Depends(get_db)):

    # 1. Save quiz
    quiz = Quiz(
        title=payload["title"],
        description=payload["description"]
    )

    db.add(quiz)
    db.commit()
    db.refresh(quiz)  # get quiz.id

    # 2. Save questions
    for q in payload["questions"]:

        question = Question(
            quiz_id=quiz.id,
            type=q["type"],
            question=q["question"],
            options=json.dumps(q["options"]),  # convert array → string
            answer=str(q["answer"])
        )

        db.add(question)

    db.commit()

    return {
        "message": "Quiz saved successfully",
        "quiz_id": quiz.id
    }