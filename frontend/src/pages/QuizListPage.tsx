import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import "./QuizEditPage.css"; // Reuse similar styling

type Quiz = {
  id: number;
  title: string;
  description: string;
  unit_id: number | null;
  unit_code: string | null;
  unit_name: string | null;
  completed: boolean;
  score?: number;
  total_questions?: number;
};

const QuizListPage: React.FC = () => {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
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
    const fetchQuizzes = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/quizzes`);
        if (!res.ok) throw new Error("Failed to fetch quizzes");
        const data = await res.json();
        setQuizzes(data);
      } catch (err) {
        console.error("Error loading quizzes:", err);
      }
    };
    fetchQuizzes();
  }, [API_BASE]);

  const filteredQuizzes = quizzes.filter((quiz) =>
    quiz.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="qe-page">
      <Navbar />

      <div className="qe-container">
        <button 
          onClick={() => navigate("/quiz")} 
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
          ← Back to Dashboard
        </button>

        <div className="qe-header">
          <div>
            <h1>Available Quizzes</h1>
            <p>Select a quiz to start your attempt</p>
          </div>

          <input
            className="qe-search"
            placeholder="Search quizzes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="qe-list">
          {filteredQuizzes.length === 0 ? (
            <p style={{ marginTop: "20px" }}>No quizzes available at the moment.</p>
          ) : (
            filteredQuizzes.map((quiz) => (
              <div className="qe-card" key={quiz.id}>
                <div className="qe-left">
                  <div className="qe-icon">📝</div>
                  <div>
                    <h2>{quiz.title}</h2>
                    <p>{quiz.description}</p>
                    {quiz.unit_code && (
                      <p style={{ color: "#fbbc05", marginTop: "6px" }}>
                        {quiz.unit_code} - {quiz.unit_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="qe-actions">
                  {quiz.completed ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <span style={{ color: "#4bb543", fontWeight: "bold", fontSize: "14px" }}>
                        Completed ({quiz.score}/{quiz.total_questions})
                      </span>
                      <button
                        className="qe-btn qe-results"
                        onClick={() => navigate(`/quiz/take/${quiz.id}`)}
                      >
                        Review
                      </button>
                    </div>
                  ) : (
                    <button
                      className="qe-btn qe-edit"
                      onClick={() => navigate(`/quiz/take/${quiz.id}`)}
                    >
                      Take Quiz
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default QuizListPage;
