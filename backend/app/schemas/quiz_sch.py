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
    unit_id: Optional[int] = Field(default=None, description="Assigned unit ID for this quiz")
    time_limit_minutes: Optional[int] = Field(default=None, description="Optional time limit for the quiz in minutes")
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
    score: Optional[int] = None
    total_questions: Optional[int] = None
    user_answers: List[Optional[Union[int, str]]] = Field(default_factory=list)

class QuizAttemptResponse(BaseModel):
    id: int
    user_id: int
    quiz_id: int
    score: int
    total_questions: int
    
    class Config:
        from_attributes = True


class QuizAttemptResultItem(BaseModel):
    id: int
    user_id: int
    student_name: str
    student_email: str
    score: int
    total_questions: int
    percentage: float
    submitted_at: Optional[str] = None


class QuizAttemptResultsResponse(BaseModel):
    quiz_id: int
    quiz_title: str
    quiz_description: str
    unit_id: Optional[int] = None
    unit_code: Optional[str] = None
    unit_name: Optional[str] = None
    total_attempts: int
    attempts: List[QuizAttemptResultItem]


class QuizAttemptReviewQuestion(BaseModel):
    question_number: int
    type: str
    question: str
    options: List[str] = []
    student_answer: Optional[str] = None
    correct_answer: str
    is_correct: bool


class QuizAttemptReviewResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    quiz_title: str
    quiz_description: str
    unit_id: Optional[int] = None
    unit_code: Optional[str] = None
    unit_name: Optional[str] = None
    student_name: str
    student_email: str
    score: int
    total_questions: int
    percentage: float
    submitted_at: Optional[str] = None
    review_available: bool
    review_message: Optional[str] = None
    questions: List[QuizAttemptReviewQuestion]
