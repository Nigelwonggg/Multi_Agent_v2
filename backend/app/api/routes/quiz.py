from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.databases.chat_database import get_db
from app.models.quiz import Quiz
from app.models.question import Question
import json

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])

@router.get("")
def get_quizzes(db: Session = Depends(get_db)):
    return db.query(Quiz).all()

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

@router.post("")
def create_quiz(payload: dict, db: Session = Depends(get_db)):
    # 1. Save quiz
    quiz = Quiz(
        title=payload["title"],
        description=payload["description"]
    )

    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    # 2. Save questions
    for q in payload["questions"]:
        question = Question(
            quiz_id=quiz.id,
            type=q["type"],
            question=q["question"],
            options=json.dumps(q["options"]),
            answer=str(q["answer"])
        )
        db.add(question)

    db.commit()

    return {
        "message": "Quiz saved successfully",
        "quiz_id": quiz.id
    }

@router.put("/{quiz_id}")
def update_quiz(quiz_id: int, payload: dict, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Update quiz info
    quiz.title = payload.get("title", quiz.title)
    quiz.description = payload.get("description", quiz.description)
    
    # Update questions
    db.query(Question).filter(Question.quiz_id == quiz_id).delete()
    
    for q in payload.get("questions", []):
        question = Question(
            quiz_id=quiz_id,
            type=q["type"],
            question=q["question"],
            options=json.dumps(q["options"]),
            answer=str(q["answer"])
        )
        db.add(question)
        
    db.commit()
    return {"message": "Quiz updated successfully"}
