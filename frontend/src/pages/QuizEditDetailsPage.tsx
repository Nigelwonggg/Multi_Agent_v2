import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import "./QuizCreationPage.css";

type QuestionType = "mcq" | "short";

type Question = {
  type: QuestionType;
  question: string;
  options: string[];
  answer: number | string | null;
};

const QuizEditDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  // 📥 Load quiz from backend
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`http://localhost:8000/quizzes/${id}`);
        const data = await res.json();

        setTitle(data.title);
        setDescription(data.description);
        setQuestions(data.questions || []);
      } catch (err) {
        console.error("Failed to load quiz", err);
      }
    };

    fetchQuiz();
  }, [id]);

  // ✏️ Update question text
  const updateQuestion = (index: number, value: string) => {
    const copy = [...questions];
    copy[index].question = value;
    setQuestions(copy);
  };

  // ✏️ Update option
  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const copy = [...questions];
    copy[qIndex].options[oIndex] = value;
    setQuestions(copy);
  };

  // 🎯 Set answer
  const setAnswer = (qIndex: number, value: number | string) => {
    const copy = [...questions];
    copy[qIndex].answer = value;
    setQuestions(copy);
  };

  // 💾 Save updated quiz
  const handleUpdate = async () => {
    const payload = {
      title,
      description,
      questions,
    };

    try {
      const res = await fetch(`http://localhost:8000/quizzes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        navigate("/quiz");
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
      <p className="qc-subtitle">Modify your quiz</p>

      <div className="qc-create-container">
        {/* QUIZ INFO */}
        <div className="qc-card">
          <input
            className="qc-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="qc-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* QUESTIONS */}
        {questions.map((q, index) => (
          <div className="qc-card" key={index}>
            <h2>Question {index + 1}</h2>

            <input
              className="qc-input"
              value={q.question}
              onChange={(e) =>
                updateQuestion(index, e.target.value)
              }
            />

            {/* MCQ */}
            {q.type === "mcq" && (
              <div className="qc-options">
                {q.options.map((opt, i) => (
                  <div key={i} className="qc-option-row">
                    <input
                      type="radio"
                      checked={q.answer === i}
                      onChange={() => setAnswer(index, i)}
                    />

                    <input
                      className="qc-input"
                      value={opt}
                      onChange={(e) =>
                        updateOption(index, i, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* SHORT ANSWER */}
            {q.type === "short" && (
              <input
                className="qc-input"
                value={(q.answer as string) || ""}
                onChange={(e) =>
                  setAnswer(index, e.target.value)
                }
              />
            )}
          </div>
        ))}

        {/* SAVE */}
        <div className="qc-actions-bottom">
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