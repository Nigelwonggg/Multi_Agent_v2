import React from 'react';
import { useParams } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow/ChatWindow';
import './ChatPage.css';

// --- TEST FLAG ---
// Set this to true to enable the test data loading button in the UI.
const TEST_MODE = true;
// --- END TEST FLAG ---

const ChatPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();

  return (
    <div className="chat-page">
      <ChatWindow chatId={chatId || null} showTestButton={TEST_MODE} />
    </div>
  );
};

export default ChatPage;

