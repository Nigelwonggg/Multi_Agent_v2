import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  const links = [
    { 
      group: "Navigation", 
      items: [
        { label: "Chat", to: "/chat" },
        { label: "Vector DB", to: "/vector-database" },
        { label: "Upload PDF", to: "/upload-pdf" },
        { label: "Quiz", to: "#quiz" }
      ] 
    },
    { 
      group: "Account", 
      items: [
        { label: "Login", to: "#login" },
        { label: "Sign Up", to: "#signup" },
        { label: "Settings", to: "#settings" }
      ] 
    },
  ];

  return (
    <footer className="footer">
      <div className="footer__inner">
        {/* Top Row */}
        <div className="footer__top">
          {/* Brand */}
          <div className="footer__brand">
            <div className="footer__logo">
              <span className="footer__logo-icon">⬡</span>
              <span className="footer__logo-text">
                Tutor<span className="footer__logo-accent">AI</span>
              </span>
            </div>
            <p className="footer__tagline">
              Intelligent AI powered by your own documents. Study smarter and more efficiently with our system.
            </p>
          </div>

          {/* Link Groups */}
          {links.map((group) => (
            <div key={group.group} className="footer__link-group">
              <h4 className="footer__group-title">{group.group}</h4>
              <ul className="footer__group-list">
                {group.items.map((item) => (
                  <li key={item.label}>
                    {item.to.startsWith("#") ? (
                      <a href={item.to} className="footer__link">
                        {item.label}
                      </a>
                    ) : (
                      <Link to={item.to} className="footer__link">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="footer__divider" />

        {/* Bottom Row */}
        <div className="footer__bottom">
          <p className="footer__copy">© {year} MCS16 FYP Project.</p>
          <div className="footer__badges">
            <span className="footer__badge">RAG Powered</span>
            <span className="footer__badge">Vector Search</span>
            <span className="footer__badge">Open Source</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;