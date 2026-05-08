import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./HeroSection.css";

const HeroSection = () => {
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

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
          {user ? `Welcome back, ${(user.full_name || 'User').split(' ')[0]}!` : "Your Personal Educational AI Tutor"}
          <br />
          <span>Educational AI Tutor</span>
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
          {(!user || user.role === 'lecturer') && (
            <Link to="/vector-database" className="btn-secondary">
              Upload Materials
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;