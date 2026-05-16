import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import { useQuizGeneration } from "../contexts/QuizGenerationContext";
import "./QuizCreationPage.css"; // Reuse styling for cards and inputs

const QuickQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeJob, startQuizGeneration, clearQuizGeneration } = useQuizGeneration();

  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);

  const isGenerating = activeJob?.status === "running";

  useEffect(() => {
    if (
      !generationJobId ||
      activeJob?.id !== generationJobId ||
      activeJob.mode !== "quick" ||
      activeJob.status !== "completed" ||
      !activeJob.result
    ) {
      return;
    }

    navigate("/quiz/take/temp", { state: { quiz: activeJob.result } });
    clearQuizGeneration();
  }, [activeJob, clearQuizGeneration, generationJobId, navigate]);

  const handleGenerate = () => {
    if (!topic.trim()) {
      alert("Please enter a topic for your quiz!");
      return;
    }

    const jobId = startQuizGeneration({
      mode: "quick",
      topic: topic.trim(),
      numQuestions,
    });

    if (!jobId) {
      return;
    }

    setGenerationJobId(jobId);
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

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default QuickQuizPage;
