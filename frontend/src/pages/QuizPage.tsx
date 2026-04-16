import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import './QuizPage.css';

const QuizDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="quiz-dashboard">
      <Navbar />

      <h1 className="quiz-title">Manage Your Quizzes</h1>

      <div className="quiz-cards">

        {/* CREATE QUIZ */}
        <div className="quiz-card">
          <div className="icon">+</div>
          <h2>Create New Quiz</h2>
          <p>Start a quiz from scratch</p>

          <button onClick={() => navigate("/quiz/create")}>
            Create Quiz
          </button>
        </div>

        {/* EDIT QUIZ */}
        <div className="quiz-card">
          <div className="icon">📝</div>
          <h2>Edit Existing Quiz</h2>
          <p>Modify or manage your past quizzes</p>

          <button onClick={() => navigate("/quiz/edit")}>
            View Quizzes
          </button>
        </div>

      </div>

      <Footer />
    </div>
  );
};

export default QuizDashboard;