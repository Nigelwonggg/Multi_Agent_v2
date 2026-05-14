from pydantic import BaseModel, Field
from typing import List, Optional, Union

class QuestionBase(BaseModel):
    type: str = Field(..., description="The type of question: 'mcq' or 'short'")
    question: str = Field(..., description="The question text")
    options: List[str] = Field(default=[], description="List of options for MCQ. Empty for short answer.")
    answer: Union[int, str] = Field(..., description="Index of correct option (0-based) for MCQ, or keyword(s) for short answer.")

class QuizBase(BaseModel):
    title: str = Field(..., description="The title of the quiz")
    description: str = Field(..., description="A brief description of the quiz")
    questions: List[QuestionBase] = Field(..., description="List of questions in the quiz")

class QuizGenerateRequest(BaseModel):
    topic: str = Field(..., description="The topic to generate the quiz about")
    num_questions: int = Field(default=5, description="Number of questions to generate")

class QuizCreateResponse(BaseModel):
    message: str
    quiz_id: int

class QuizAttemptBase(BaseModel):
    user_id: int
    quiz_id: int
    score: int
    total_questions: int

class QuizAttemptResponse(BaseModel):
    id: int
    user_id: int
    quiz_id: int
    score: int
    total_questions: int
    
    class Config:
        from_attributes = True
