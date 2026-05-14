import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import "./QuizCreationPage.css";

type QuestionType = "mcq" | "short";

type Question = {
  id: number;
  type: QuestionType;
  question: string;
  options: string[];
  answer: number | null; // MCQ correct index
  shortAnswer?: string;  // short answer correct text
};

const QuizEditDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // 📥 Load quiz from backend
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`${API_BASE}/quizzes/${id}`);
        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();

        setTitle(data.title);
        setDescription(data.description);
        
        // Map backend questions to our frontend state with IDs
        const mappedQuestions = (data.questions || []).map((q: any, idx: number) => ({
          id: idx + Date.now(),
          type: q.type,
          question: q.question,
          options: q.options || [],
          answer: q.type === "mcq" ? (typeof q.answer === "number" ? q.answer : parseInt(q.answer)) : null,
          shortAnswer: q.type === "short" ? q.answer : "",
        }));

        setQuestions(mappedQuestions);
      } catch (err) {
        console.error("Failed to load quiz", err);
      }
    };

    fetchQuiz();
  }, [id, API_BASE]);

  // ➕ Add question
  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "mcq",
        question: "",
        options: ["", ""],
        answer: null,
        shortAnswer: "",
      },
    ]);
  };

  // ❌ Delete question
  const deleteQuestion = (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // ✏️ Update question text
  const updateQuestion = (id: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, question: value } : q
      )
    );
  };

  // 🔄 Change type
  const changeType = (id: number, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              type,
              options: type === "mcq" ? ["", ""] : [],
              answer: null,
              shortAnswer: type === "short" ? "" : "",
            }
          : q
      )
    );
  };

  // ✏️ MCQ option update
  const updateOption = (qId: number, i: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? {
              ...q,
              options: q.options.map((opt, index) =>
                index === i ? value : opt
              ),
            }
          : q
      )
    );
  };

  // 🎯 MCQ answer select
  const setAnswer = (qId: number, index: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? { ...q, answer: index } : q
      )
    );
  };

  // ➕ Add MCQ option
  const addOption = (qId: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? { ...q, options: [...q.options, ""] }
          : q
      )
    );
  };

  // ❌ Remove MCQ option
  const removeOption = (qId: number, index: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        if (q.options.length <= 2) return q;

        return {
          ...q,
          options: q.options.filter((_, i) => i !== index),
          answer:
            q.answer === index
              ? null
              : q.answer !== null && q.answer > index
              ? q.answer - 1
              : q.answer,
        };
      })
    );
  };

  // ✏️ Short answer update
  const updateShortAnswer = (qId: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? { ...q, shortAnswer: value } : q
      )
    );
  };

  // 💾 Save updated quiz
  const handleUpdate = async () => {
    const payload = {
      title,
      description,
      questions: questions.map((q) => ({
        type: q.type,
        question: q.question,
        options: q.type === "mcq" ? q.options : [],
        answer: q.type === "mcq" ? q.answer : q.shortAnswer,
      })),
    };

    try {
      const res = await fetch(`${API_BASE}/quizzes/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        navigate("/quiz/edit");
      } else {
        alert("Failed to update quiz");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating quiz");
    }
  };

  return (
    <div className="qc-dashboard">
      <Navbar />

      <h1 className="qc-title">Edit Quiz</h1>
      <p className="qc-subtitle">Modify and customize your quiz</p>

      <div className="qc-create-container">
        <button 
          onClick={() => navigate("/quiz/edit")} 
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
          ← Back to List
        </button>

        {/* QUIZ INFO */}
        <div className="qc-card">
          <h2>Quiz Title</h2>

          <input
            className="qc-input"
            placeholder="Enter quiz title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="qc-input"
            placeholder="Enter quiz description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* QUESTIONS */}
        {questions.map((q, index) => (
          <div className="qc-card" key={q.id}>
            <div className="qc-card-header">
              <h2>Question {index + 1}</h2>

              <div className="qc-actions">
                <select
                  value={q.type}
                  onChange={(e) =>
                    changeType(q.id, e.target.value as QuestionType)
                  }
                >
                  <option value="mcq">MCQ</option>
                  <option value="short">Short Answer</option>
                </select>

                <button
                  className="qc-delete-btn"
                  onClick={() => deleteQuestion(q.id)}
                >
                  Delete
                </button>
              </div>
            </div>

            <input
              className="qc-input"
              placeholder="Enter question"
              value={q.question}
              onChange={(e) =>
                updateQuestion(q.id, e.target.value)
              }
            />

            {/* MCQ */}
            {q.type === "mcq" && (
              <div className="qc-options">
                <p className="qc-short-note">
                  Remember to tick the correct answer:
                </p>

                {q.options.map((opt, i) => (
                  <div key={i} className="qc-option-row">
                    <input
                      type="radio"
                      checked={q.answer === i}
                      onChange={() => setAnswer(q.id, i)}
                    />

                    <input
                      className="qc-input"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) =>
                        updateOption(q.id, i, e.target.value)
                      }
                    />

                    <button
                      type="button"
                      onClick={() => removeOption(q.id, i)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "red",
                        cursor: "pointer",
                        fontSize: "16px",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addOption(q.id)}
                  style={{
                    marginTop: "10px",
                    backgroundColor: "#fbbc05",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  + Add Option
                </button>
              </div>
            )}

            {/* SHORT ANSWER */}
            {q.type === "short" && (
              <div className="qc-options">
                <p className="qc-short-note">
                  Enter keywords (separate with commas for multiple required keywords):
                </p>

                <input
                  className="qc-input"
                  placeholder="e.g. DNA, helix, genetic"
                  value={q.shortAnswer || ""}
                  onChange={(e) =>
                    updateShortAnswer(q.id, e.target.value)
                  }
                />
              </div>
            )}
          </div>
        ))}

        {/* ACTIONS */}
        <div className="qc-actions-bottom">
          <button onClick={addQuestion}>+ Add Question</button>

          <button className="qc-save-btn" onClick={handleUpdate}>
            Save Changes
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default QuizEditDetailsPage;