import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import "./QuizCreationPage.css"; // Reuse styling for cards and inputs

const QuickQuizPage: React.FC = () => {
  const navigate = useNavigate();

  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const showGenerationProgress = isGenerating || generationProgress > 0;

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

  const handleGenerate = async () => {
    if (!topic) {
      alert("Please enter a topic for your quiz!");
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

      setGenerationProgress(100);
      window.setTimeout(() => {
        navigate("/quiz/take/temp", { state: { quiz: data } });
      }, 450);
    } catch (err) {
      console.error(err);
      setGenerationProgress(0);
      setIsGenerating(false);
      alert("Error generating quiz. Please try again.");
    }
  };

  return (
    <div className="qc-dashboard">
      <Navbar />

      <h1 className="qc-title">Quick AI Quiz</h1>
      <p className="qc-subtitle">Generate a custom study session instantly</p>

      <div className="qc-create-container" style={{ maxWidth: "600px", margin: "0 auto" }}>
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

        <div className="qc-card ai-gen-card" style={{ padding: "40px" }}>
          <h2>🪄 Create Your Quiz</h2>
          <p className="qc-short-note">What would you like to practice today?</p>
          
          <div style={{ marginTop: "25px" }}>
            <label style={{ color: "#fbbc05", fontWeight: "bold", display: "block", marginBottom: "8px" }}>Topic</label>
            <input
              className="qc-input"
              placeholder="e.g. Astrophysics, Human Anatomy, React Hooks..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              style={{ fontSize: "1.1rem", padding: "12px" }}
            />
          </div>

          <div style={{ marginTop: "20px" }}>
            <label style={{ color: "#fbbc05", fontWeight: "bold", display: "block", marginBottom: "8px" }}>Number of Questions</label>
            <input
              type="number"
              className="qc-input"
              min={1}
              max={20}
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              disabled={isGenerating}
              style={{ width: "100%", fontSize: "1.1rem", padding: "12px" }}
            />
          </div>

          <button 
            className="qc-ai-btn" 
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{ width: "100%", marginTop: "30px", padding: "15px", fontSize: "1.1rem" }}
          >
            {isGenerating ? "Generating Quiz..." : "Generate & Start Practice"}
          </button>

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
      </div>

      <Footer />
    </div>
  );
};

export default QuickQuizPage;
