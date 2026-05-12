import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  id: number;
  title: string;
  description: string;
  questions: Question[];
};

const QuizTakePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<(string | number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`${API_BASE}/quizzes/${id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setQuiz(data);
        setUserAnswers(new Array(data.questions.length).fill(null));
      } catch (err) {
        console.error("Failed to load quiz", err);
      }
    };
    fetchQuiz();
  }, [id, API_BASE]);

  const handleAnswerChange = (index: number, value: string | number) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    setUserAnswers(newAnswers);
  };

  const handleSubmit = () => {
    if (!quiz) return;

    let correctCount = 0;
    quiz.questions.forEach((q, idx) => {
      const userAnswer = userAnswers[idx];
      if (q.type === "mcq") {
        if (Number(userAnswer) === Number(q.answer)) {
          correctCount++;
        }
      } else {
        const studentAns = String(userAnswer || "").toLowerCase();
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

    setScore(correctCount);
    setSubmitted(true);
  };

  if (!quiz) return <div className="qc-dashboard"><Navbar /><h1>Loading...</h1><Footer /></div>;

  return (
    <div className="qc-dashboard">
      <Navbar />

      <h1 className="qc-title">{quiz.title}</h1>
      <p className="qc-subtitle">{quiz.description}</p>

      <div className="qc-create-container">
        {!submitted ? (
          <>
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
          <div className="qc-card" style={{ textAlign: "center" }}>
            <h2>Quiz Completed!</h2>
            <p style={{ fontSize: "2rem", margin: "20px 0" }}>
              Your Score: {score} / {quiz.questions.length}
            </p>
            <p>({Math.round((score / quiz.questions.length) * 100)}%)</p>
            <button 
              className="qc-save-btn" 
              style={{ marginTop: "20px" }}
              onClick={() => navigate("/quiz/list")}
            >
              Back to Quizzes
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default QuizTakePage;
