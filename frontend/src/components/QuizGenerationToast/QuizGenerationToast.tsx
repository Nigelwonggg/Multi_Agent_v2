import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiArrowUpRight, FiCheckCircle, FiCpu } from 'react-icons/fi';
import { useQuizGeneration } from '../../contexts/QuizGenerationContext';
import './QuizGenerationToast.css';

const TOAST_ORDER_EPOCH_MS = 1700000000000;

const shorten = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
};

const QuizGenerationToast: React.FC = () => {
  const { activeJob, clearQuizGeneration } = useQuizGeneration();
  const navigate = useNavigate();

  if (!activeJob) {
    return null;
  }

  const isDone = activeJob.status === 'completed';
  const isFailed = activeJob.status === 'failed';
  const label = isDone
    ? 'Quiz generated'
    : isFailed
      ? 'Quiz generation failed'
      : 'Generating quiz';
  const targetPath = activeJob.mode === 'quick' ? '/quiz/quick' : '/quiz/create';
  const stackOrder = Math.max(0, Math.floor((activeJob.startedAt - TOAST_ORDER_EPOCH_MS) / 100));

  const handleOpen = () => {
    if (activeJob.mode === 'quick' && activeJob.status === 'completed' && activeJob.result) {
      navigate('/quiz/take/temp', { state: { quiz: activeJob.result } });
      clearQuizGeneration();
      return;
    }

    navigate(targetPath);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen();
    }
  };

  return (
    <aside
      className={`quiz-generation-toast ${isDone ? 'is-done' : ''} ${isFailed ? 'is-failed' : ''}`}
      aria-label="Open quiz generation"
      aria-live="polite"
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      style={{ order: stackOrder }}
    >
      <div className="quiz-generation-header">
        <div className="quiz-generation-title">
          <span className="quiz-generation-icon" aria-hidden="true">
            {isDone ? <FiCheckCircle /> : isFailed ? <FiAlertCircle /> : <FiCpu />}
          </span>
          <div>
            <p>{label}</p>
            <span>{shorten(activeJob.topic, 34)}</span>
          </div>
        </div>
        <span className="quiz-generation-open" aria-hidden="true">
          <FiArrowUpRight />
        </span>
      </div>

      <div className="quiz-generation-detail">
        {isDone
          ? activeJob.mode === 'quick'
            ? 'Click to start the generated quiz.'
            : 'Click to open the generated draft.'
          : isFailed
            ? activeJob.error || 'Please try again.'
            : `${activeJob.numQuestions} questions requested`}
      </div>

      <div className="quiz-generation-track" aria-hidden="true">
        <div className="quiz-generation-fill" style={{ width: `${activeJob.progress}%` }} />
      </div>

      <div className="quiz-generation-footer">
        <span>{isDone ? 'Done' : isFailed ? 'Failed' : `${activeJob.progress}%`}</span>
        <span>{activeJob.mode === 'quick' ? 'Quick quiz' : 'Draft quiz'}</span>
      </div>
    </aside>
  );
};

export default QuizGenerationToast;
