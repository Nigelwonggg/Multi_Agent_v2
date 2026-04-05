import React from 'react';
import './RobotDecorations.css';

const RobotDecorations: React.FC = () => {
  return (
    <div className="robot-wrapper">
      <div className="robot-sticky-container robot-sticky-container--left">
        <svg
          className="robot-svg"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2a1 1 0 0 1 1 1v1h3a2 2 0 0 1 2 2v2a6 6 0 0 1-3 5.196V15a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1.804A6 6 0 0 1 6 8V6a2 2 0 0 1 2-2h3V3a1 1 0 0 1 1-1z"
            fill="currentColor"
          />
          <rect x="9" y="8" width="2" height="2" rx="1" fill="white" />
          <rect x="13" y="8" width="2" height="2" rx="1" fill="white" />
          <path d="M10 12h4" stroke="white" strokeLinecap="round" />
          <rect x="7" y="18" width="10" height="4" rx="1" fill="currentColor" />
        </svg>
      </div>
      <div className="robot-sticky-container robot-sticky-container--right">
        <svg
          className="robot-svg"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2a1 1 0 0 1 1 1v1h3a2 2 0 0 1 2 2v2a6 6 0 0 1-3 5.196V15a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1.804A6 6 0 0 1 6 8V6a2 2 0 0 1 2-2h3V3a1 1 0 0 1 1-1z"
            fill="currentColor"
          />
          <rect x="9" y="8" width="2" height="2" rx="1" fill="white" />
          <rect x="13" y="8" width="2" height="2" rx="1" fill="white" />
          <path d="M10 12h4" stroke="white" strokeLinecap="round" />
          <rect x="7" y="18" width="10" height="4" rx="1" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
};

export default RobotDecorations;
