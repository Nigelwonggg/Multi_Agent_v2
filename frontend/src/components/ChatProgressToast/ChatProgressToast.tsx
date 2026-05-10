import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowUpRight, FiCpu } from 'react-icons/fi';
import {
  getChatProgressSnapshot,
  subscribeChatProgress,
} from '../../stores/chatStore';
import type { ChatProgressSnapshot } from '../../stores/chatStore';
import './ChatProgressToast.css';

const DONE_VISIBLE_MS = 3000;

function estimateProgress(startedAt: number | null, now: number) {
  if (!startedAt) return 0;

  const elapsedSeconds = Math.max(0, (now - startedAt) / 1000);

  if (elapsedSeconds < 2) {
    return 16 + elapsedSeconds * 12;
  }

  if (elapsedSeconds < 8) {
    return 40 + (elapsedSeconds - 2) * 6;
  }

  if (elapsedSeconds < 20) {
    return 76 + (elapsedSeconds - 8) * 1.2;
  }

  return Math.min(96, 90 + (elapsedSeconds - 20) * 0.2);
}

function getProgressLabel(startedAt: number | null, now: number) {
  if (!startedAt) return 'Preparing chat';

  const elapsedSeconds = Math.max(0, (now - startedAt) / 1000);

  if (elapsedSeconds < 2) return 'Preparing chat';
  if (elapsedSeconds < 8) return 'Retrieving sources';
  if (elapsedSeconds < 20) return 'Generating answer';
  return 'Still working';
}

function shorten(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

const ChatProgressToast: React.FC = () => {
  const [snapshot, setSnapshot] = useState<ChatProgressSnapshot>(() => getChatProgressSnapshot());
  const [completedSnapshot, setCompletedSnapshot] = useState<ChatProgressSnapshot | null>(null);
  const [now, setNow] = useState(Date.now());
  const lastRunningSnapshotRef = useRef<ChatProgressSnapshot | null>(
    snapshot.chatId && snapshot.startedAt ? snapshot : null
  );
  const doneTimerRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return subscribeChatProgress(() => {
      setSnapshot(getChatProgressSnapshot());
      setNow(Date.now());
    });
  }, []);

  useEffect(() => {
    if (!snapshot.chatId) return;

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => window.clearInterval(timer);
  }, [snapshot.chatId]);

  useEffect(() => {
    if (snapshot.chatId && snapshot.startedAt) {
      lastRunningSnapshotRef.current = snapshot;
      setCompletedSnapshot(null);

      if (doneTimerRef.current) {
        window.clearTimeout(doneTimerRef.current);
        doneTimerRef.current = null;
      }

      return;
    }

    const lastRunningSnapshot = lastRunningSnapshotRef.current;
    if (!lastRunningSnapshot) return;

    lastRunningSnapshotRef.current = null;
    setCompletedSnapshot(lastRunningSnapshot);

    doneTimerRef.current = window.setTimeout(() => {
      setCompletedSnapshot(null);
      doneTimerRef.current = null;
    }, DONE_VISIBLE_MS);
  }, [snapshot]);

  useEffect(() => {
    return () => {
      if (doneTimerRef.current) {
        window.clearTimeout(doneTimerRef.current);
      }
    };
  }, []);

  const displaySnapshot = snapshot.chatId && snapshot.startedAt
    ? snapshot
    : completedSnapshot;
  const isDone = Boolean(!snapshot.chatId && completedSnapshot);

  if (!displaySnapshot?.chatId) {
    return null;
  }

  const progress = isDone ? 100 : Math.round(estimateProgress(displaySnapshot.startedAt, now));
  const label = isDone ? 'Done - answer ready' : getProgressLabel(displaySnapshot.startedAt, now);
  const extraChats = isDone ? 0 : displaySnapshot.totalPendingChats - 1;
  const handleOpenChat = () => {
    navigate(`/chat/${displaySnapshot.chatId}`);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpenChat();
    }
  };

  return (
    <aside
      className={`chat-progress-toast ${isDone ? 'is-done' : ''}`}
      aria-label={`Open chat ${displaySnapshot.title}`}
      aria-live="polite"
      role="button"
      tabIndex={0}
      onClick={handleOpenChat}
      onKeyDown={handleKeyDown}
    >
      <div className="chat-progress-header">
        <div className="chat-progress-title">
          <span className="chat-progress-icon" aria-hidden="true">
            <FiCpu />
          </span>
          <div>
            <p>{label}</p>
            <span>{shorten(displaySnapshot.title, 34)}</span>
          </div>
        </div>
        <span className="chat-progress-open" aria-hidden="true">
          <FiArrowUpRight />
        </span>
      </div>

      {(isDone || displaySnapshot.prompt) && (
        <div className="chat-progress-prompt">
          {isDone ? 'Click to open the completed chat.' : shorten(displaySnapshot.prompt, 64)}
        </div>
      )}

      <div className="chat-progress-track" aria-hidden="true">
        <div className="chat-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="chat-progress-footer">
        <span>{isDone ? 'Done' : `${progress}%`}</span>
        {extraChats > 0 && <span>{extraChats} more running</span>}
      </div>
    </aside>
  );
};

export default ChatProgressToast;
