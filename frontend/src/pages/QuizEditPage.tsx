import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import "./QuizEditPage.css";

type Quiz = {
  id: number;
  title: string;
  description: string;
  unit_id: number | null;
  unit_code: string | null;
  unit_name: string | null;
  is_active: boolean;
  is_locked: boolean;
  can_manage: boolean;
};

const QuizEditPage: React.FC = () => {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [search, setSearch] = useState("");
  const [actionState, setActionState] = useState<{
    quizId: number;
    action: "activate" | "hide" | "show";
    title: string;
    message: string;
  } | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const fetchWithAuth = async (url: string, options?: RequestInit) => {
    const token = localStorage.getItem("token");
    const headers = new Headers(options?.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
  };

  // 🔥 Delete quiz
  const handleDelete = async (quizId: number) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this quiz?");
    if (!confirmDelete) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/quizzes/${quizId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      } else {
        alert("Failed to delete quiz");
      }
    } catch (err) {
      console.error("Error deleting quiz:", err);
      alert("Error deleting quiz");
    }
  };

  const updateQuizStatus = (quizId: number, updates: Partial<Quiz>) => {
    setQuizzes((prev) => prev.map((quiz) => (quiz.id === quizId ? { ...quiz, ...updates } : quiz)));
  };

  const handleStatusAction = async () => {
    if (!actionState || isSubmittingAction) return;

    const endpoint =
      actionState.action === "activate"
        ? "activate"
        : actionState.action === "hide"
        ? "hide"
        : "show";

    try {
      setIsSubmittingAction(true);
      const response = await fetchWithAuth(`${API_BASE}/quizzes/${actionState.quizId}/${endpoint}`, {
        method: "POST",
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.detail || "Unable to update quiz visibility.");
      }

      if (actionState.action === "activate") {
        updateQuizStatus(actionState.quizId, { is_active: true, is_locked: true });
      } else if (actionState.action === "hide") {
        updateQuizStatus(actionState.quizId, { is_active: false, is_locked: true });
      } else {
        updateQuizStatus(actionState.quizId, { is_active: true, is_locked: true });
      }

      setActionState(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to update quiz visibility.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 🔥 Fetch quizzes from backend
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/quizzes`);

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
  }, [API_BASE]);

  // 🔍 Filter quizzes by search
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
                    {quiz.unit_code && (
                      <p style={{ color: "#fbbc05", marginTop: "6px" }}>
                        {quiz.unit_code} - {quiz.unit_name}
                      </p>
                    )}
                    <p style={{ marginTop: "8px", color: quiz.is_active ? "#88d77f" : quiz.is_locked ? "#93c5fd" : "#ffbc99", fontWeight: 700 }}>
                      {quiz.is_active ? "Active" : quiz.is_locked ? "Hidden" : "Draft"}
                    </p>
                  </div>
                </div>

                <div className="qe-actions">
                  {(!quiz.can_manage || !quiz.is_locked) && (
                    <>
                      <button
                        className="qe-btn qe-edit"
                        onClick={() => navigate(`/quiz/edit/${quiz.id}`)}
                      >
                        {quiz.can_manage && !quiz.is_locked ? "Edit" : "View"}
                      </button>

                      {quiz.can_manage && !quiz.is_locked && (
                        <button
                          className="qe-btn qe-activate"
                          onClick={() =>
                            setActionState({
                              quizId: quiz.id,
                              action: "activate",
                              title: "Make this quiz active?",
                              message: "Students will be able to see this quiz, and it can no longer be edited afterwards.",
                            })
                          }
                        >
                          Make Active
                        </button>
                      )}
                    </>
                  )}

                  <button
                    className="qe-btn qe-results"
                    onClick={() => navigate(`/quiz/results/${quiz.id}`)}
                  >
                    Results
                  </button>

                  {quiz.can_manage && quiz.is_locked && (
                    <button
                      className={`qe-btn ${quiz.is_active ? "qe-hide" : "qe-show"}`}
                      onClick={() =>
                        setActionState({
                          quizId: quiz.id,
                          action: quiz.is_active ? "hide" : "show",
                          title: quiz.is_active ? "Hide this quiz from students?" : "Show this quiz to students?",
                          message: quiz.is_active
                            ? "Students will no longer see this quiz, but it will stay locked from editing."
                            : "Students will be able to see this quiz again. It will remain locked from editing.",
                        })
                      }
                    >
                      {quiz.is_active ? "Hide from Students" : "Show to Students"}
                    </button>
                  )}

                  {quiz.can_manage && !quiz.is_locked && (
                    <button 
                      className="qe-btn qe-delete"
                      onClick={() => handleDelete(quiz.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {actionState && (
        <div className="qe-modal-overlay" onClick={() => !isSubmittingAction && setActionState(null)}>
          <div className="qe-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{actionState.title}</h2>
            <p>{actionState.message}</p>
            <div className="qe-modal-actions">
              <button className="qe-btn qe-modal-cancel" onClick={() => setActionState(null)} disabled={isSubmittingAction}>
                Cancel
              </button>
              <button className="qe-btn qe-activate" onClick={handleStatusAction} disabled={isSubmittingAction}>
                {isSubmittingAction ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default QuizEditPage;
