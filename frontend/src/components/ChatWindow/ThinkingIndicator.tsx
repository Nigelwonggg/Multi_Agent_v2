import React from 'react';
import { FaRobot } from 'react-icons/fa';
import './ThinkingIndicator.css';

const ThinkingIndicator: React.FC = () => {
  return (
    <div className="message bot">
      <div className="avatar">
        <FaRobot />
      </div>
      <div className="thinking-indicator-bubble">
        <div className="thinking-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <span className="thinking-text">Thinking...</span>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
