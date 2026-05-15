import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import "./QuizResultsPage.css";

type AttemptResult = {
  id: number;
  user_id: number;
  student_name: string;
  student_email: string;
  score: number;
  total_questions: number;
  percentage: number;
  submitted_at: string | null;
};

type QuizResultsData = {
  quiz_id: number;
  quiz_title: string;
  quiz_description: string;
  unit_id: number | null;
  unit_code: string | null;
  unit_name: string | null;
  total_attempts: number;
  attempts: AttemptResult[];
};

const QuizResultsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState<QuizResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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
    const loadResults = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchWithAuth(`${API_BASE}/quizzes/${id}/attempts`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.detail || "Failed to load quiz results.");
        }

        setResults(payload as QuizResultsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quiz results.");
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [API_BASE, id]);

  const filteredAttempts = useMemo(() => {
    if (!results) return [];

    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return results.attempts;

    return results.attempts.filter((attempt) =>
      attempt.student_name.toLowerCase().includes(normalizedSearch) ||
      attempt.student_email.toLowerCase().includes(normalizedSearch)
    );
  }, [results, search]);

  const averagePercentage = useMemo(() => {
    if (!results || results.attempts.length === 0) return 0;

    const total = results.attempts.reduce((sum, attempt) => sum + attempt.percentage, 0);
    return Math.round((total / results.attempts.length) * 10) / 10;
  }, [results]);

  const topScore = useMemo(() => {
    if (!results || results.attempts.length === 0) return null;
    return Math.max(...results.attempts.map((attempt) => attempt.percentage));
  }, [results]);

  return (
    <div className="qr-page">
      <Navbar />

      <div className="qr-container">
        <button
          onClick={() => navigate("/quiz/edit")}
          className="qr-back-btn"
        >
          ← Back to Quizzes
        </button>

        {loading ? (
          <div className="qr-empty-state">Loading results...</div>
        ) : error ? (
          <div className="qr-empty-state qr-empty-state-error">{error}</div>
        ) : results ? (
          <>
            <div className="qr-hero">
              <div>
                <p className="qr-kicker">Lecturer Results</p>
                <h1>{results.quiz_title}</h1>
                <p className="qr-description">{results.quiz_description}</p>
                {results.unit_code && (
                  <p className="qr-unit-pill">
                    {results.unit_code} - {results.unit_name}
                  </p>
                )}
              </div>
            </div>

            <div className="qr-summary-grid">
              <div className="qr-summary-card">
                <span>Total Attempts</span>
                <strong>{results.total_attempts}</strong>
              </div>
              <div className="qr-summary-card">
                <span>Average Score</span>
                <strong>{averagePercentage}%</strong>
              </div>
              <div className="qr-summary-card">
                <span>Top Score</span>
                <strong>{topScore !== null ? `${topScore}%` : "No attempts yet"}</strong>
              </div>
            </div>

            <div className="qr-toolbar">
              <input
                className="qr-search"
                placeholder="Search by student name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {filteredAttempts.length === 0 ? (
              <div className="qr-empty-state">
                {results.attempts.length === 0
                  ? "No students have attempted this quiz yet."
                  : "No student attempts match your search."}
              </div>
            ) : (
              <div className="qr-attempt-list">
                {filteredAttempts.map((attempt) => (
                  <div className="qr-attempt-card" key={attempt.id}>
                    <div className="qr-attempt-head">
                      <div>
                        <h2>{attempt.student_name}</h2>
                        <p>{attempt.student_email}</p>
                      </div>
                      <div className="qr-score-pill">
                        {attempt.score}/{attempt.total_questions} ({attempt.percentage}%)
                      </div>
                    </div>
                    <div className="qr-attempt-meta">
                      Submitted{" "}
                      {attempt.submitted_at
                        ? new Date(attempt.submitted_at).toLocaleString()
                        : "at an unknown time"}
                    </div>
                    <div style={{ marginTop: "16px" }}>
                      <button
                        className="qr-action-btn"
                        onClick={() => navigate(`/quiz/results/${results.quiz_id}/attempt/${attempt.id}`)}
                      >
                        Review submission
                      </button>
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

export default QuizResultsPage;
