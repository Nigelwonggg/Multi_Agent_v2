import React from "react";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import { useSmoothNavigate } from "../hooks/useSmoothNavigate";
import './QuizPage.css';

const QuizDashboard: React.FC = () => {
  const smoothNavigate = useSmoothNavigate();
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const isLecturer = user?.role === "lecturer";

  return (
    <div className="quiz-dashboard">
      <Navbar />

      <h1 className="quiz-title">
        {isLecturer ? "Manage Your Quizzes" : "Student Quiz Portal"}
      </h1>

      <div className="quiz-cards">
        {isLecturer && (
          <>
            {/* CREATE QUIZ */}
            <div className="quiz-card">
              <div className="icon">+</div>
              <h2>Create New Quiz</h2>
              <p>Start a quiz from scratch</p>
              <button onClick={() => smoothNavigate("/quiz/create")}>
                Create Quiz
              </button>
            </div>

            {/* EDIT QUIZ */}
            <div className="quiz-card">
              <div className="icon">📝</div>
              <h2>Edit Existing Quiz</h2>
              <p>Modify or manage your past quizzes</p>
              <button onClick={() => smoothNavigate("/quiz/edit")}>
                View Quizzes
              </button>
            </div>
          </>
        )}

        {!isLecturer && (
          <>
            <div className="quiz-card">
              <div className="icon">🎓</div>
              <h2>Take Quizzes</h2>
              <p>View available quizzes and test your knowledge</p>
              <button onClick={() => smoothNavigate("/quiz/list")}>
                Go to Quizzes
              </button>
            </div>

            {/* QUICK AI QUIZ FOR STUDENTS */}
            <div className="quiz-card quick-ai-card">
              <div className="icon">🪄</div>
              <h2>Quick AI Quiz</h2>
              <p>Generate a custom study quiz instantly using AI!</p>
              <button 
                onClick={() => smoothNavigate("/quiz/quick")}
              >
                Create Quick Quiz
              </button>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default QuizDashboard;
