import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const QuizCreationPage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: Date.now(),
      type: "mcq",
      question: "",
      options: ["", ""],
      answer: null,
      shortAnswer: "",
    },
  ]);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // 🤖 AI Generate Quiz
  const handleAIGenerate = async () => {
    if (!topic) {
      alert("Please enter a topic for AI generation");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/quizzes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, num_questions: numQuestions }),
      });

      if (!res.ok) throw new Error("Failed to generate quiz");

      const data = await res.json();
      
      setTitle(data.title);
      setDescription(data.description);
      
      const newQuestions: Question[] = data.questions.map((q: any, index: number) => ({
        id: Date.now() + index,
        type: q.type,
        question: q.question,
        options: q.options || [],
        answer: q.type === "mcq" ? q.answer : null,
        shortAnswer: q.type === "short" ? q.answer : "",
      }));

      setQuestions(newQuestions);
    } catch (err) {
      console.error(err);
      alert("Error generating quiz with AI");
    } finally {
      setIsGenerating(false);
    }
  };

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

  // 💾 Save quiz
  const handleSave = async () => {
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

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const res = await fetch(`${API_BASE}/quizzes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    navigate("/quiz");
  } else {
    alert("Failed to save quiz");
  }
};

  return (
    <div className="qc-dashboard">
      <Navbar />

      <h1 className="qc-title">Create New Quiz</h1>
      <p className="qc-subtitle">Create and customize your quiz</p>

      <div className="qc-create-container">
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

        {/* AI GENERATION */}
        <div className="qc-card ai-gen-card">
          <h2>🪄 Generate with AI</h2>
          <p className="qc-short-note">Enter a topic and let AI create the quiz for you!</p>
          <div className="qc-ai-row">
            <input
              className="qc-input"
              placeholder="e.g. Molecular Biology, History of Rome, Python Basics"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
            />
            <input
              type="number"
              className="qc-input"
              style={{ width: "80px" }}
              min={1}
              max={20}
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              disabled={isGenerating}
            />
            <button 
              className="qc-ai-btn" 
              onClick={handleAIGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate Quiz"}
            </button>
          </div>
        </div>

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

          <button className="qc-save-btn" onClick={handleSave}>
            Save Quiz
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default QuizCreationPage;