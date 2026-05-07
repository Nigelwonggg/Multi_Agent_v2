import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import "./QuizEditPage.css";

type Quiz = {
  id: number;
  title: string;
  description: string;
};

const QuizEditPage: React.FC = () => {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [search, setSearch] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // 🔥 Fetch quizzes from backend
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await fetch(`${API_BASE}/quizzes`);

        if (!res.ok) {
          throw new Error("Failed to fetch quizzes");
        }

        const data = await res.json();
        setQuizzes(data);
      } catch (err) {
        console.error("Error loading quizzes:", err);
      }
    };

    fetchQuizzes();
  }, []);

  // 🔍 Filter quizzes by search
  const filteredQuizzes = quizzes.filter((quiz) =>
    quiz.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="qe-page">
      <Navbar />

      <div className="qe-container">
        {/* HEADER */}
        <div className="qe-header">
          <div>
            <h1>Edit Existing Quiz</h1>
            <p>Modify or manage your past quizzes</p>
          </div>

          <input
            className="qe-search"
            placeholder="Search quizzes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* QUIZ LIST */}
        <div className="qe-list">
          {filteredQuizzes.length === 0 ? (
            <p style={{ marginTop: "20px" }}>
              No quizzes found.
            </p>
          ) : (
            filteredQuizzes.map((quiz) => (
              <div className="qe-card" key={quiz.id}>
                <div className="qe-left">
                  <div className="qe-icon">📘</div>

                  <div>
                    <h2>{quiz.title}</h2>
                    <p>{quiz.description}</p>
                  </div>
                </div>

                <div className="qe-actions">
                  <button
                    className="qe-btn qe-edit"
                    onClick={() =>
                      navigate(`/quiz/edit/${quiz.id}`)
                    }
                  >
                    Edit
                  </button>

                  <button className="qe-btn qe-results">
                    Results
                  </button>

                  <button className="qe-btn qe-more">
                    More ▾
                  </button>
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

export default QuizEditPage;