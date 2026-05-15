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

type ExistingQuestion =
  | {
      type: "mcq";
      question: string;
      options?: string[];
      answer: number | string;
    }
  | {
      type: "short";
      question: string;
      options?: string[];
      answer: string;
    };

type UnitRecord = {
  id: number;
  unit_code: string;
  unit_name: string;
};

type QuizDetailsResponse = {
  title: string;
  description: string;
  unit_id?: number | null;
  can_manage?: boolean;
  questions?: ExistingQuestion[];
};

const QuizEditDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedUnits, setAssignedUnits] = useState<UnitRecord[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<number | "">("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [canManage, setCanManage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [isUnitHighlighted, setIsUnitHighlighted] = useState(false);
  const [highlightedQuestionIds, setHighlightedQuestionIds] = useState<number[]>([]);
  const [popupState, setPopupState] = useState<{
    title: string;
    message: string;
    focusQuestionId?: number;
    focusTarget?: "unit";
  } | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const fetchWithAuth = async (url: string, options?: RequestInit) => {
    const token = localStorage.getItem("token");
    const headers = new Headers(options?.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
  };

  const clearQuestionHighlight = (questionId: number) => {
    setHighlightedQuestionIds((prev) => prev.filter((id) => id !== questionId));
  };

  const scrollToQuestion = (questionId?: number) => {
    if (!questionId) return;

    requestAnimationFrame(() => {
      document
        .getElementById(`quiz-edit-question-${questionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const closePopup = () => {
    const focusQuestionId = popupState?.focusQuestionId;
    const focusTarget = popupState?.focusTarget;
    setPopupState(null);

    if (focusTarget === "unit") {
      requestAnimationFrame(() => {
        document
          .getElementById("quiz-edit-unit-select")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("quiz-edit-unit-select") as HTMLSelectElement | null)?.focus();
      });
      return;
    }

    scrollToQuestion(focusQuestionId);
  };

  useEffect(() => {
    const loadAssignedUnits = async () => {
      try {
        setIsLoadingUnits(true);
        const response = await fetchWithAuth(`${API_BASE}/identity-registry/me/assigned-units`);
        if (!response.ok) {
          throw new Error("Failed to load your assigned units.");
        }

        const units: UnitRecord[] = await response.json();
        setAssignedUnits(units);
        setSelectedUnitId((currentUnitId) => {
          if (currentUnitId !== "" && units.some((unit) => unit.id === currentUnitId)) {
            return currentUnitId;
          }
          return units.length === 1 ? units[0].id : "";
        });
      } catch (error) {
        console.error(error);
        setPopupState({
          title: "Unable to load units",
          message: "We could not load your assigned units. Please refresh and try again.",
        });
      } finally {
        setIsLoadingUnits(false);
      }
    };

    loadAssignedUnits();
  }, [API_BASE]);

  // 📥 Load quiz from backend
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/quizzes/${id}`);
        if (!res.ok) throw new Error("Failed to fetch");

        const data: QuizDetailsResponse = await res.json();

        setTitle(data.title);
        setDescription(data.description);
        setSelectedUnitId(typeof data.unit_id === "number" ? data.unit_id : "");
        setCanManage(data.can_manage !== false);
        
        // Map backend questions to our frontend state with IDs
        const mappedQuestions: Question[] = ((data.questions || []) as ExistingQuestion[]).map((q, idx: number) => ({
          id: idx + Date.now(),
          type: q.type,
          question: q.question,
          options: q.options || [],
          answer: q.type === "mcq" ? (typeof q.answer === "number" ? q.answer : parseInt(q.answer)) : null,
          shortAnswer: q.type === "short" ? q.answer : "",
        }));

        setQuestions(mappedQuestions);
        setPopupState(null);
        setHighlightedQuestionIds([]);
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
    clearQuestionHighlight(id);
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
    clearQuestionHighlight(id);
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
    clearQuestionHighlight(qId);
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
    clearQuestionHighlight(qId);
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
    clearQuestionHighlight(qId);
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? { ...q, shortAnswer: value } : q
      )
    );
  };

  // 💾 Save updated quiz
  const handleUpdate = async () => {
    if (isSaving) return;

    if (questions.length === 0) {
      setPopupState({
        title: "Add at least one question",
        message: "A quiz must contain at least one question before it can be saved.",
      });
      return;
    }

    if (selectedUnitId === "") {
      setIsUnitHighlighted(true);
      setPopupState({
        title: "Choose a unit",
        message: "Please choose one of your assigned units before saving this quiz.",
        focusTarget: "unit",
      });
      return;
    }

    const invalidMcqQuestions = questions
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => {
        if (question.type !== "mcq") return false;

        const filledOptions = question.options.filter((option) => option.trim() !== "");
        const selectedOption =
          question.answer !== null ? question.options[question.answer]?.trim() ?? "" : "";

        return filledOptions.length < 2 || selectedOption === "";
      });

    const invalidShortAnswerQuestions = questions
      .map((question, index) => ({ question, index }))
      .filter(
        ({ question }) =>
          question.type === "short" && (!question.shortAnswer || question.shortAnswer.trim() === "")
      );

    if (invalidMcqQuestions.length > 0) {
      const questionNumbers = invalidMcqQuestions.map(({ index }) => index + 1).join(", ");

      setHighlightedQuestionIds(
        invalidMcqQuestions.map(({ question }) => question.id)
      );
      setPopupState({
        title:
          invalidMcqQuestions.length === 1
            ? "Complete the MCQ options"
            : "Complete the MCQ options",
        message:
          invalidMcqQuestions.length === 1
            ? `Question ${questionNumbers} needs at least two filled options, and the selected correct answer must be one of them.`
            : `Questions ${questionNumbers} need at least two filled options, and each selected correct answer must be one of them.`,
        focusQuestionId: invalidMcqQuestions[0]?.question.id,
      });
      return;
    }

    if (invalidShortAnswerQuestions.length > 0) {
      const questionNumbers = invalidShortAnswerQuestions.map(({ index }) => index + 1).join(", ");

      setHighlightedQuestionIds(
        invalidShortAnswerQuestions.map(({ question }) => question.id)
      );
      setPopupState({
        title: "Complete the short answer",
        message:
          invalidShortAnswerQuestions.length === 1
            ? `Question ${questionNumbers} needs a correct short answer before saving this quiz.`
            : `Questions ${questionNumbers} need correct short answers before saving this quiz.`,
        focusQuestionId: invalidShortAnswerQuestions[0]?.question.id,
      });
      return;
    }

    const payload = {
      title,
      description,
      unit_id: selectedUnitId,
      questions: questions.map((q) => ({
        type: q.type,
        question: q.question,
        options: q.type === "mcq" ? q.options : [],
        answer: q.type === "mcq" ? q.answer : q.shortAnswer,
      })),
    };

    try {
      setIsSaving(true);
      const res = await fetchWithAuth(`${API_BASE}/quizzes/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        navigate("/quiz/edit");
      } else {
        let errorMessage = "Something went wrong while updating this quiz. Please try again.";
        try {
          const errorData = await res.json();
          if (typeof errorData?.detail === "string" && errorData.detail.trim() !== "") {
            errorMessage = errorData.detail;
          }
        } catch {
          // Ignore JSON parsing errors and fall back to the default message.
        }
        setPopupState({
          title: "Unable to save changes",
          message: errorMessage,
        });
      }
    } catch (err) {
      console.error(err);
      setPopupState({
        title: "Unable to save changes",
        message: "Something went wrong while updating this quiz. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="qc-dashboard">
      <Navbar />

      <h1 className="qc-title">{canManage ? "Edit Quiz" : "View Quiz"}</h1>
      <p className="qc-subtitle">
        {canManage ? "Modify and customize your quiz" : "This quiz is shared through one of your assigned units."}
      </p>

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
            disabled={!canManage}
          />

          <textarea
            className="qc-input"
            placeholder="Enter quiz description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canManage}
          />

          <div style={{ marginTop: "18px" }}>
            <label
              htmlFor="quiz-edit-unit-select"
              style={{ color: "#fbbc05", fontWeight: "bold", display: "block", marginBottom: "8px" }}
            >
              Unit
            </label>
            <select
              id="quiz-edit-unit-select"
              className={`qc-input ${isUnitHighlighted ? "qc-input-warning" : ""}`}
              value={selectedUnitId}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedUnitId(value ? Number(value) : "");
                if (value) {
                  setIsUnitHighlighted(false);
                }
              }}
              disabled={!canManage || isLoadingUnits || assignedUnits.length === 0}
            >
              <option value="">
                {isLoadingUnits ? "Loading units..." : "Select one of your assigned units"}
              </option>
              {assignedUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unit_code} - {unit.unit_name}
                </option>
              ))}
            </select>
            {assignedUnits.length === 0 && !isLoadingUnits && (
              <p className="qc-short-note">
                You do not have any assigned units yet. Ask an admin to assign one before editing quizzes.
              </p>
            )}
          </div>
        </div>

        {/* QUESTIONS */}
        {questions.map((q, index) => {
          const isHighlighted = highlightedQuestionIds.includes(q.id);

          return (
          <div
            className={`qc-card ${isHighlighted ? "qc-card-warning" : ""}`}
            key={q.id}
            id={`quiz-edit-question-${q.id}`}
          >
            <div className="qc-card-header">
              <h2>Question {index + 1}</h2>

              <div className="qc-actions">
                <select
                  value={q.type}
                  onChange={(e) =>
                    changeType(q.id, e.target.value as QuestionType)
                  }
                  disabled={!canManage}
                >
                  <option value="mcq">MCQ</option>
                  <option value="short">Short Answer</option>
                </select>

                <button
                  className="qc-delete-btn"
                  onClick={() => deleteQuestion(q.id)}
                  disabled={!canManage}
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
              disabled={!canManage}
            />

            {isHighlighted && (
              <div className="qc-inline-warning">
                Complete the required answer for this question before saving.
              </div>
            )}

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
                      disabled={!canManage}
                    />

                    <input
                      className="qc-input"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) =>
                        updateOption(q.id, i, e.target.value)
                      }
                      disabled={!canManage}
                    />

                    <button
                      type="button"
                      onClick={() => removeOption(q.id, i)}
                      disabled={!canManage}
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
                  disabled={!canManage}
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
                  disabled={!canManage}
                />
              </div>
            )}
          </div>
        )})}

        {/* ACTIONS */}
        <div className="qc-actions-bottom">
          <button onClick={addQuestion} disabled={!canManage}>+ Add Question</button>

          <button className="qc-save-btn" onClick={handleUpdate} disabled={!canManage || isSaving}>
            {!canManage ? "View Only" : isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {popupState && (
        <div className="qc-popup-overlay" role="presentation" onClick={closePopup}>
          <div
            className="qc-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-edit-popup-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qc-popup-icon" aria-hidden="true">
              !
            </div>
            <h2 id="quiz-edit-popup-title">{popupState.title}</h2>
            <p>{popupState.message}</p>
            <button className="qc-popup-btn" onClick={closePopup}>
              {popupState.focusQuestionId || popupState.focusTarget ? "Review details" : "Close"}
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default QuizEditDetailsPage;
