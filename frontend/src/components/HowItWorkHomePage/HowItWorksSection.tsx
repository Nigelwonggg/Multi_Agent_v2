import React, { useEffect, useRef } from "react";
import "./HowItWorksSection.css";

interface Step {
  number: string;
  icon: string;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: "01",
    icon: "📁",
    title: "Upload Your Materials",
    description:
      "Drag and drop your PDF materials. The system parses and chunks them automatically.",
  },
  {
    number: "02",
    icon: "🔢",
    title: "Vector Embeddings Created",
    description:
      "Each chunk is converted into a high-dimensional vector embedding and stored in the vector database for semantic retrieval.",
  },
  {
    number: "03",
    icon: "🤖",
    title: "Ask the AI Tutor",
    description:
      "Type your question in the chat. The AI searches the vector DB for the most relevant chunks and reply with a multimodal answer.",
  },
  {
    number: "04",
    icon: "🏆",
    title: "Test Yourself with Quizzes",
    description:
      "Take uploaded quizzes. Get instant feedback and scores with explanations related to your own study materials.",
  },
];

const HowItWorksSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible"));
      },
      { threshold: 0.1 }
    );
    const el = sectionRef.current;
    if (!el) return;
    el.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="howitworks" ref={sectionRef} id="how-it-works">
      {/* Background stripe */}
      <div className="howitworks__bg" />

      <div className="howitworks__inner">
        {/* Header */}
        <div className="howitworks__header fade-in">
          <p className="section-label">Workflow</p>
          <div className="section-divider" />
          <h2 className="howitworks__title">How It Works</h2>
          <p className="howitworks__subtitle">
            From file upload to intelligent multimodal answers  — four simple steps.
          </p>
        </div>

        {/* Steps */}
        <div className="howitworks__steps stagger-children">
          {steps.map((step, i) => (
            <div key={step.number} className="step-card fade-in">
              {/* Connector line (between cards) */}
              {i < steps.length - 1 && <div className="step-card__connector" />}

              <div className="step-card__number">{step.number}</div>
              <div className="step-card__icon-wrap">
                <span>{step.icon}</span>
              </div>
              <h3 className="step-card__title">{step.title}</h3>
              <p className="step-card__desc">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;