import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./FeaturesSection.css";

interface Feature {
  id: string;
  icon: string;
  label: string;
  title: string;
  description: string;
  to: string;
  accent: string;
}

const features: Feature[] = [
  {
    id: "chat",
    icon: "💬",
    label: "Chat Interface",
    title: "Ask Anything",
    description:
      "Chat with an AI that has read all your uploaded materials. Get cited, context-aware answers drawn directly from your own documents.",
    to: "/chat",
    accent: "#00e5ff",
  },
  {
    id: "vectordb",
    icon: "🗄️",
    label: "Vector Database",
    title: "Semantic Search Engine",
    description:
      "Your content is embedded into a vector database. The AI retrieves the most relevant chunks — not just keywords.",
    to: "/vector-database",
    accent: "#a78bfa",
  },
  {
    id: "upload",
    icon: "📄",
    label: "PDF Upload",
    title: "Feed Your Knowledge Base",
    description:
      "Upload PDF materials. They are parsed, chunked, and indexed automatically so the AI can reference them at any time.",
    to: "#pdf",
    accent: "#34d399",
  },
  {
    id: "quiz",
    icon: "🧩",
    label: "Quiz & Marking System",
    title: "Test What You've Learned",
    description:
      "Upload and answer quizzes tied to your study materials. The AI grades your answers and explains mistakes using your own uploaded content.",
    to: "#quiz",
    accent: "#fb923c",
  },
];

const FeaturesSection = () => {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    const el = sectionRef.current;
    if (!el) return;

    el.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section className="features" ref={sectionRef} id="features">
      <div className="features__inner">
        {/* Header */}
        <div className="features__header fade-in">
          <p className="section-label">Core Features</p>
          <div className="section-divider" />
          <h2 className="features__title">
            Everything You Need to Learn More Effectively
          </h2>
          <p className="features__subtitle">
            Four modules — all working together to make
            studying easier, faster, and more effective.
          </p>
        </div>

        {/* Cards */}
        <div className="features__grid stagger-children">
          {features.map((f) => (
            f.to.startsWith("#") ? (
              <a
                key={f.id}
                href={f.to}
                className="feature-card fade-in"
                style={{ "--card-accent": f.accent } as React.CSSProperties}
              >
                <div className="feature-card__glow" />
                <div className="feature-card__icon-wrap">
                  <span className="feature-card__icon">{f.icon}</span>
                </div>
                <p className="feature-card__label">{f.label}</p>
                <h3 className="feature-card__title">{f.title}</h3>
                <p className="feature-card__desc">{f.description}</p>
                <span className="feature-card__cta">Explore →</span>
              </a>
            ) : (
              <Link
                key={f.id}
                to={f.to}
                className="feature-card fade-in"
                style={{ "--card-accent": f.accent } as React.CSSProperties}
              >
                <div className="feature-card__glow" />
                <div className="feature-card__icon-wrap">
                  <span className="feature-card__icon">{f.icon}</span>
                </div>
                <p className="feature-card__label">{f.label}</p>
                <h3 className="feature-card__title">{f.title}</h3>
                <p className="feature-card__desc">{f.description}</p>
                <span className="feature-card__cta">Explore →</span>
              </Link>
            )
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;