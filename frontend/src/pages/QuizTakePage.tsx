import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import "./QuizCreationPage.css"; // Reuse styling for consistency

type Question = {
  type: "mcq" | "short";
  question: string;
  options: string[];
  answer: string | number;
};

type QuizData = {
  id?: number | string;
  title: string;
  description: string;
  unit_id?: number | null;
  unit_code?: string | null;
  unit_name?: string | null;
  questions: Question[];
};

const QuizTakePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<(string | number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const fetchWithAuth = async (url: string, options?: RequestInit) => {
    const token = localStorage.getItem("token");
    const headers = new Headers(options?.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    const fetchQuiz = async () => {
      // Check if it's a temporary quiz passed via state
      if (id === "temp" && location.state?.quiz) {
        const data = location.state.quiz;
        setQuiz(data);
        setUserAnswers(new Array(data.questions.length).fill(null));
        return;
      }

      try {
        const res = await fetchWithAuth(`${API_BASE}/quizzes/${id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setQuiz(data);
        setUserAnswers(new Array(data.questions.length).fill(null));
      } catch (err) {
        console.error("Failed to load quiz", err);
      }
    };
    fetchQuiz();
  }, [id, API_BASE, location.state]);

  const handleAnswerChange = (index: number, value: string | number) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    setUserAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    let correctCount = 0;
    quiz.questions.forEach((q, idx) => {
      const userAnswer = userAnswers[idx];
      
      // If unanswered, it's wrong
      if (userAnswer === null || (typeof userAnswer === "string" && userAnswer.trim() === "")) {
        return;
      }

      if (q.type === "mcq") {
        if (Number(userAnswer) === Number(q.answer)) {
          correctCount++;
        }
      } else {
        const studentAns = String(userAnswer).toLowerCase();
        // Split correct answer by commas to get individual keywords
        const keywords = String(q.answer)
          .toLowerCase()
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k !== "");

        if (
          keywords.length > 0 &&
          keywords.every((kw) => studentAns.includes(kw))
        ) {
          correctCount++;
        }
      }
    });

    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    // Record attempt for official quizzes
    if (id !== "temp" && user) {
      try {
        await fetchWithAuth(`${API_BASE}/quizzes/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            quiz_id: Number(id),
            score: correctCount,
            total_questions: quiz.questions.length,
            user_answers: userAnswers,
          }),
        });
      } catch (err) {
        console.error("Failed to record attempt", err);
      }
    }

    setScore(correctCount);
    setSubmitted(true);
  };

  if (!quiz) return <div className="qc-dashboard"><Navbar /><h1>Loading...</h1><Footer /></div>;

  return (
    <div className="qc-dashboard">
      <Navbar />

      <h1 className="qc-title">{quiz.title}</h1>
      <p className="qc-subtitle">{quiz.description}</p>
      {quiz.unit_code && (
        <p className="qc-subtitle" style={{ marginTop: "-8px", color: "#fbbc05" }}>
          {quiz.unit_code} - {quiz.unit_name}
        </p>
      )}

      <div className="qc-create-container">
        {!submitted ? (
          <>
            <button 
              onClick={() => navigate(id === "temp" ? "/quiz" : "/quiz/list")} 
              className="qc-back-btn"
              style={{ 
                background: "transparent", 
                border: "1px solid #fbbc05", 
                color: "#fbbc05", 
                padding: "8px 16px", 
                borderRadius: "6px", 
                cursor: "pointer",
                fontWeight: "bold",
                marginBottom: "20px"
              }}
            >
              ← Exit Quiz
            </button>

            {quiz.questions.map((q, index) => (
              <div className="qc-card" key={index}>
                <h2>Question {index + 1}</h2>
                <p style={{ fontSize: "1.2rem", marginBottom: "15px" }}>{q.question}</p>

                {q.type === "mcq" ? (
                  <div className="qc-options">
                    {q.options.map((opt, i) => (
                      <div key={i} className="qc-option-row">
                        <input
                          type="radio"
                          name={`question-${index}`}
                          checked={userAnswers[index] === i}
                          onChange={() => handleAnswerChange(index, i)}
                        />
                        <span style={{ marginLeft: "10px" }}>{opt}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <input
                    className="qc-input"
                    placeholder="Your answer..."
                    value={userAnswers[index] as string || ""}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                  />
                )}
              </div>
            ))}

            <div className="qc-actions-bottom">
              <button className="qc-save-btn" onClick={handleSubmit}>
                Submit Quiz
              </button>
            </div>
          </>
        ) : (
          <div className="results-container">
            <div className="qc-card" style={{ textAlign: "center" }}>
              <h2>Quiz Completed!</h2>
              <p style={{ fontSize: "2.5rem", margin: "10px 0", color: "#fbbc05" }}>
                {score} / {quiz.questions.length}
              </p>
              <p style={{ fontSize: "1.2rem", opacity: 0.8 }}>
                Final Score: {Math.round((score / quiz.questions.length) * 100)}%
              </p>
            </div>

            {quiz.questions.map((q, idx) => {
              const userAnswer = userAnswers[idx];
              let isCorrect = false;

              // Check if answered
              const isAnswered = userAnswer !== null && (typeof userAnswer !== "string" || userAnswer.trim() !== "");

              if (isAnswered) {
                if (q.type === "mcq") {
                  isCorrect = Number(userAnswer) === Number(q.answer);
                } else {
                  const studentAns = String(userAnswer).toLowerCase();
                  const keywords = String(q.answer)
                    .toLowerCase()
                    .split(",")
                    .map((k) => k.trim())
                    .filter((k) => k !== "");
                  isCorrect = keywords.length > 0 && keywords.every((kw) => studentAns.includes(kw));
                }
              }

              return (
                <div className={`qc-card ${isCorrect ? 'result-correct' : 'result-wrong'}`} key={idx}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3>Question {idx + 1}</h3>
                    <span style={{ 
                      padding: "4px 12px", 
                      borderRadius: "20px", 
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      backgroundColor: isCorrect ? "rgba(75, 181, 67, 0.2)" : "rgba(255, 77, 79, 0.2)",
                      color: isCorrect ? "#4bb543" : "#ff4d4f",
                      border: `1px solid ${isCorrect ? "#4bb543" : "#ff4d4f"}`
                    }}>
                      {isCorrect ? "CORRECT" : "INCORRECT"}
                    </span>
                  </div>
                  
                  <p style={{ fontSize: "1.1rem", margin: "15px 0" }}>{q.question}</p>
                  
                  <div className="result-detail" style={{ 
                    padding: "15px", 
                    borderRadius: "8px", 
                    backgroundColor: "rgba(0,0,0,0.2)",
                    borderLeft: `4px solid ${isCorrect ? "#4bb543" : "#ff4d4f"}`
                  }}>
                    <p>
                      <strong>Your Answer:</strong> {" "}
                      {q.type === "mcq" 
                        ? (userAnswer !== null ? q.options[Number(userAnswer)] : <span style={{opacity: 0.5}}>No answer provided</span>)
                        : (userAnswer || <span style={{opacity: 0.5}}>No answer provided</span>)
                      }
                    </p>
                    
                    {!isCorrect && (
                      <p style={{ marginTop: "10px", color: "#fbbc05" }}>
                        <strong>Correct Answer:</strong> {" "}
                        {q.type === "mcq" ? q.options[Number(q.answer)] : q.answer}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="qc-actions-bottom" style={{ justifyContent: "center", marginTop: "40px" }}>
              <button 
                className="qc-save-btn" 
                onClick={() => navigate(id === "temp" ? "/quiz" : "/quiz/list")}
                style={{ padding: "12px 40px", fontSize: "1.1rem" }}
              >
                {id === "temp" ? "Back to Dashboard" : "Back to Quizzes"}
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default QuizTakePage;
