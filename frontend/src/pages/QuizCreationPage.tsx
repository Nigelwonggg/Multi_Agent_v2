import React, { useEffect, useState } from "react";
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

type GeneratedQuestion =
  | {
      type: "mcq";
      question: string;
      options?: string[];
      answer: number;
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

const QuizCreationPage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [timerMode, setTimerMode] = useState<"unlimited" | "timed">("unlimited");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("30");
  const [assignedUnits, setAssignedUnits] = useState<UnitRecord[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<number | "">("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [isTopicHighlighted, setIsTopicHighlighted] = useState(false);
  const [isUnitHighlighted, setIsUnitHighlighted] = useState(false);
  const [isTimerHighlighted, setIsTimerHighlighted] = useState(false);
  const [highlightedQuestionIds, setHighlightedQuestionIds] = useState<number[]>([]);
  const [popupState, setPopupState] = useState<{
    title: string;
    message: string;
    focusQuestionId?: number;
    focusTarget?: "topic" | "unit" | "timer";
  } | null>(null);

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
  const showGenerationProgress = isGenerating || generationProgress > 0;

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
        .getElementById(`quiz-question-${questionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const closePopup = () => {
    const focusQuestionId = popupState?.focusQuestionId;
    const focusTarget = popupState?.focusTarget;
    setPopupState(null);

    if (focusTarget === "topic") {
      requestAnimationFrame(() => {
        document
          .getElementById("quiz-ai-topic-input")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("quiz-ai-topic-input") as HTMLInputElement | null)?.focus();
      });
      return;
    }

    if (focusTarget === "unit") {
      requestAnimationFrame(() => {
        document
          .getElementById("quiz-unit-select")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("quiz-unit-select") as HTMLSelectElement | null)?.focus();
      });
      return;
    }

    if (focusTarget === "timer") {
      requestAnimationFrame(() => {
        document
          .getElementById("quiz-time-limit-input")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        (document.getElementById("quiz-time-limit-input") as HTMLInputElement | null)?.focus();
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

  useEffect(() => {
    if (!isGenerating) {
      return;
    }

    setGenerationProgress((current) => Math.max(current, 6));

    const progressTimer = window.setInterval(() => {
      setGenerationProgress((current) => {
        if (current >= 94) {
          return current;
        }

        const remaining = 94 - current;
        const step = Math.max(1, Math.ceil(remaining * 0.08));
        return Math.min(94, current + step);
      });
    }, 420);

    return () => window.clearInterval(progressTimer);
  }, [isGenerating]);

  // 🤖 AI Generate Quiz
  const handleAIGenerate = async () => {
    if (!topic.trim()) {
      setIsTopicHighlighted(true);
      setPopupState({
        title: "Enter a topic first",
        message: "Please enter a topic before generating a quiz with AI.",
        focusTarget: "topic",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(6);
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
      setPopupState(null);
      setIsTopicHighlighted(false);
      setHighlightedQuestionIds([]);
      
      const newQuestions: Question[] = (data.questions as GeneratedQuestion[]).map((q, index: number) => ({
        id: Date.now() + index,
        type: q.type,
        question: q.question,
        options: q.options || [],
        answer: q.type === "mcq" ? q.answer : null,
        shortAnswer: q.type === "short" ? q.answer : "",
      }));

      setQuestions(newQuestions);
      setGenerationProgress(100);
      window.setTimeout(() => {
        setGenerationProgress(0);
      }, 900);
    } catch (err) {
      console.error(err);
      setGenerationProgress(0);
      setPopupState({
        title: "Unable to generate quiz",
        message: "Something went wrong while generating the quiz. Please try again in a moment.",
      });
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

  // 💾 Save quiz
  const handleSave = async () => {
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

    if (timerMode === "timed") {
      const parsedTimeLimit = Number(timeLimitMinutes);
      if (!Number.isInteger(parsedTimeLimit) || parsedTimeLimit <= 0) {
        setIsTimerHighlighted(true);
        setPopupState({
          title: "Enter a valid timer",
          message: "Please enter a quiz time limit greater than zero minutes, or switch to unlimited time.",
          focusTarget: "timer",
        });
        return;
      }
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
      const questionNumbers = invalidMcqQuestions.map(({ index }) => index + 1);
      const questionList = questionNumbers.join(", ");

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
            ? `Question ${questionList} needs at least two filled options, and the selected correct answer must be one of them.`
            : `Questions ${questionList} need at least two filled options, and each selected correct answer must be one of them.`,
        focusQuestionId: invalidMcqQuestions[0]?.question.id,
      });
      return;
    }

    if (invalidShortAnswerQuestions.length > 0) {
      const questionNumbers = invalidShortAnswerQuestions.map(({ index }) => index + 1);
      const questionList = questionNumbers.join(", ");

      setHighlightedQuestionIds(
        invalidShortAnswerQuestions.map(({ question }) => question.id)
      );
      setPopupState({
        title: "Complete the short answer",
        message:
          invalidShortAnswerQuestions.length === 1
            ? `Question ${questionList} needs a correct short answer before saving this quiz.`
            : `Questions ${questionList} need correct short answers before saving this quiz.`,
        focusQuestionId: invalidShortAnswerQuestions[0]?.question.id,
      });
      return;
    }

    const payload = {
      title,
      description,
      unit_id: selectedUnitId,
      time_limit_minutes: timerMode === "timed" ? Number(timeLimitMinutes) : null,
      questions: questions.map((q) => ({
        type: q.type,
        question: q.question,
        options: q.type === "mcq" ? q.options : [],
        answer: q.type === "mcq" ? q.answer : q.shortAnswer,
      })),
    };

    setIsSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorMessage = "Failed to save quiz";
        try {
          const errorData = await res.json();
          if (typeof errorData?.detail === "string" && errorData.detail.trim() !== "") {
            errorMessage = errorData.detail;
          }
        } catch {
          // Ignore JSON parsing errors and fall back to the default message.
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      navigate(data?.quiz_id ? `/quiz/edit/${data.quiz_id}` : "/quiz/edit");
    } catch (error) {
      console.error(error);
      setPopupState({
        title: "Unable to save quiz",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while saving. Please try again in a moment.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="qc-dashboard">
      <Navbar />

      <h1 className="qc-title">Create New Quiz</h1>
      <p className="qc-subtitle">Create and customize your quiz. New quizzes start in draft mode until you activate them.</p>

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
              id="quiz-ai-topic-input"
              className={`qc-input ${isTopicHighlighted ? "qc-input-warning" : ""}`}
              placeholder="e.g. Molecular Biology, History of Rome, Python Basics"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                if (e.target.value.trim()) {
                  setIsTopicHighlighted(false);
                }
              }}
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
          {showGenerationProgress && (
            <div className="qc-generation-progress" role="status" aria-live="polite">
              <div className="qc-generation-progress-header">
                <span>{generationProgress >= 100 ? "Quiz generated" : "Generating quiz"}</span>
                <strong>{generationProgress}%</strong>
              </div>
              <div className="qc-generation-progress-track" aria-hidden="true">
                <div
                  className="qc-generation-progress-fill"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}
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

          <div style={{ marginTop: "18px" }}>
            <label
              htmlFor="quiz-unit-select"
              style={{ color: "#fbbc05", fontWeight: "bold", display: "block", marginBottom: "8px" }}
            >
              Unit
            </label>
            <select
              id="quiz-unit-select"
              className={`qc-input ${isUnitHighlighted ? "qc-input-warning" : ""}`}
              value={selectedUnitId}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedUnitId(value ? Number(value) : "");
                if (value) {
                  setIsUnitHighlighted(false);
                }
              }}
              disabled={isLoadingUnits || assignedUnits.length === 0}
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
                You do not have any assigned units yet. Ask an admin to assign one before creating quizzes.
              </p>
            )}
          </div>

          <div style={{ marginTop: "20px" }}>
            <label style={{ color: "#fbbc05", fontWeight: "bold", display: "block", marginBottom: "10px" }}>
              Quiz Timer
            </label>
            <div className="qc-radio-group">
              <label className="qc-radio-option">
                <input
                  type="radio"
                  name="quiz-timer-mode"
                  checked={timerMode === "unlimited"}
                  onChange={() => {
                    setTimerMode("unlimited");
                    setIsTimerHighlighted(false);
                  }}
                />
                <span>Unlimited time</span>
              </label>
              <label className="qc-radio-option">
                <input
                  type="radio"
                  name="quiz-timer-mode"
                  checked={timerMode === "timed"}
                  onChange={() => setTimerMode("timed")}
                />
                <span>Set a timer</span>
              </label>
            </div>

            {timerMode === "timed" && (
              <div className="qc-timer-row">
                <input
                  id="quiz-time-limit-input"
                  type="number"
                  min={1}
                  max={1440}
                  className={`qc-input ${isTimerHighlighted ? "qc-input-warning" : ""}`}
                  value={timeLimitMinutes}
                  onChange={(e) => {
                    setTimeLimitMinutes(e.target.value);
                    if (e.target.value.trim()) {
                      setIsTimerHighlighted(false);
                    }
                  }}
                  placeholder="Enter minutes"
                />
                <span className="qc-short-note">minutes</span>
              </div>
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
            id={`quiz-question-${q.id}`}
          >
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
                  className="qc-add-option-btn"
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
        )})}

        {/* ACTIONS */}
        <div className="qc-actions-bottom">
          <button onClick={addQuestion}>+ Add Question</button>

          <button className="qc-save-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Draft"}
          </button>
        </div>
      </div>

      {popupState && (
        <div className="qc-popup-overlay" role="presentation" onClick={closePopup}>
          <div
            className="qc-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-creation-popup-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qc-popup-icon" aria-hidden="true">
              !
            </div>
            <h2 id="quiz-creation-popup-title">{popupState.title}</h2>
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

export default QuizCreationPage;
