import React from 'react';
import { FiCpu } from 'react-icons/fi';
import './ThinkingIndicator.css';

const ThinkingIndicator: React.FC = () => {
  return (
    <div className="message bot">
      <div className="avatar">
        <FiCpu />
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
