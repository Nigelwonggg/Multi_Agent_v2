import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./HeroSection.css";

const HeroSection = () => {

  const heroRef = useRef<HTMLDivElement | null>(null);

  return (
    <section className="hero" ref={heroRef}>
      {/* Background */}
      <div className="hero__orb" />

      <div className="hero__content">
        {/* Badge */}
        <div className="hero__badge">
          💡 Using RAG (Retrieval-Augmented Generation) to retrive and generate responses 💡
        </div>

        {/* Title */}
        <h1 className="hero__title">
          Your Personal <span>Educational AI Tutor</span>
        </h1>

        {/* Subtitle */}
        <p className="hero__subtitle">
          Upload your study materials, build a personalized vector database, chat with an AI chatbot that understands the syllabus,
           and generate multimodal feedback when applicable.
          <br />
          Learn more effective using AI which powered by Retrieval-Augmented Generation (RAG).
        </p>

        {/* CTA */}
        <div className="hero__actions">
          <Link to="/chat" className="btn-primary">
            Start Chatting →
          </Link>
          <Link to="" className="btn-secondary">
            Upload Materials
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;