import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import "./QuizResultsPage.css";

type ReviewQuestion = {
  question_number: number;
  type: string;
  question: string;
  options: string[];
  student_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
};

type ReviewData = {
  attempt_id: number;
  quiz_id: number;
  quiz_title: string;
  quiz_description: string;
  unit_id: number | null;
  unit_code: string | null;
  unit_name: string | null;
  student_name: string;
  student_email: string;
  score: number;
  total_questions: number;
  percentage: number;
  submitted_at: string | null;
  review_available: boolean;
  review_message: string | null;
  questions: ReviewQuestion[];
};

const QuizAttemptReviewPage: React.FC = () => {
  const { id, attemptId } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    const loadReview = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchWithAuth(`${API_BASE}/quizzes/${id}/attempts/${attemptId}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.detail || "Failed to load attempt review.");
        }

        setReview(payload as ReviewData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load attempt review.");
      } finally {
        setLoading(false);
      }
    };

    loadReview();
  }, [API_BASE, id, attemptId]);

  return (
    <div className="qr-page">
      <Navbar />

      <div className="qr-container">
        <button onClick={() => navigate(`/quiz/results/${id}`)} className="qr-back-btn">
          ← Back to Results
        </button>

        {loading ? (
          <div className="qr-empty-state">Loading submission review...</div>
        ) : error ? (
          <div className="qr-empty-state qr-empty-state-error">{error}</div>
        ) : review ? (
          <>
            <div className="qr-hero">
              <div>
                <p className="qr-kicker">Submission Review</p>
                <h1>{review.student_name}</h1>
                <p className="qr-description">{review.student_email}</p>
                {review.unit_code && (
                  <p className="qr-unit-pill">
                    {review.unit_code} - {review.unit_name}
                  </p>
                )}
              </div>
            </div>

            <div className="qr-summary-grid">
              <div className="qr-summary-card">
                <span>Quiz</span>
                <strong>{review.quiz_title}</strong>
              </div>
              <div className="qr-summary-card">
                <span>Score</span>
                <strong>
                  {review.score}/{review.total_questions} ({review.percentage}%)
                </strong>
              </div>
              <div className="qr-summary-card">
                <span>Submitted</span>
                <strong>
                  {review.submitted_at ? new Date(review.submitted_at).toLocaleString() : "Unknown"}
                </strong>
              </div>
            </div>

            {!review.review_available ? (
              <div className="qr-empty-state" style={{ marginTop: "22px" }}>
                {review.review_message || "Detailed answer review is not available for this submission."}
              </div>
            ) : (
              <div className="qr-attempt-list">
                {review.questions.map((question) => (
                  <div className="qr-attempt-card" key={question.question_number}>
                    <div className="qr-attempt-head">
                      <div>
                        <h2>
                          Question {question.question_number}
                        </h2>
                        <p>{question.question}</p>
                      </div>
                      <div
                        className="qr-score-pill"
                        style={{
                          background: question.is_correct ? "rgba(75, 181, 67, 0.12)" : "rgba(255, 77, 79, 0.12)",
                          borderColor: question.is_correct ? "rgba(75, 181, 67, 0.36)" : "rgba(255, 77, 79, 0.36)",
                          color: question.is_correct ? "#88d77f" : "#ff9b9b",
                        }}
                      >
                        {question.is_correct ? "Correct" : "Incorrect"}
                      </div>
                    </div>

                    {question.type === "mcq" && question.options.length > 0 && (
                      <div className="qr-attempt-meta" style={{ marginTop: "16px" }}>
                        Options: {question.options.join(" | ")}
                      </div>
                    )}

                    <div className="qr-attempt-meta" style={{ marginTop: "16px" }}>
                      Your student answered: {question.student_answer || "No answer provided"}
                    </div>
                    <div className="qr-attempt-meta">
                      Correct answer: {question.correct_answer}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>

      <Footer />
    </div>
  );
};

export default QuizAttemptReviewPage;
