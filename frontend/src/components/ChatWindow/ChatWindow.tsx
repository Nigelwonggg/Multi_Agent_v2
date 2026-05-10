import React, { useState, useEffect, useRef } from 'react';
import { getTestData } from '../../api/chatApi';
import type { Message as MessageType } from '../../api/chatApi';
import {
  getChatMessagesSnapshot,
  isPendingChatId,
  refreshChatMessages,
  replaceChatMessages,
  sendChatMessage,
  subscribeChatMessages,
} from '../../stores/chatStore';
import Message from '../Message/Message';
import { FiSend, FiMessageSquare, FiClipboard } from 'react-icons/fi';
import ThinkingIndicator from './ThinkingIndicator';
import './ChatWindow.css';

interface ChatWindowProps {
  chatId: string | null;
  showTestButton?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, showTestButton = false }) => {
  const [chatState, setChatState] = useState(() => getChatMessagesSnapshot(chatId));
  const [testMessages, setTestMessages] = useState<MessageType[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = chatId ? chatState.messages : testMessages;
  const loading = chatId ? chatState.loading : testLoading;
  const isThinking = chatId ? chatState.isThinking : false;
  const isPreparingChat = isPendingChatId(chatId);
  const showWelcome = !loading && messages.length === 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!chatId) {
      setChatState(getChatMessagesSnapshot(null));
      return;
    }

    setChatState(getChatMessagesSnapshot(chatId));
    const unsubscribe = subscribeChatMessages(chatId, () => {
      setChatState(getChatMessagesSnapshot(chatId));
    });

    if (!isPendingChatId(chatId)) {
      refreshChatMessages(chatId);
    }

    return unsubscribe;
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !chatId || isPreparingChat) return;

    const messageText = inputValue;
    setInputValue('');

    try {
      await sendChatMessage(chatId, messageText);
    } catch (error) {
      console.error("Failed to post message:", error);
    }
  };

  const handleLoadTestData = async () => {
    setTestLoading(true);
    try {
        const testMessage = await getTestData();
        if (chatId) {
          replaceChatMessages(chatId, [testMessage]);
        } else {
          setTestMessages([testMessage]);
        }
    } catch (error) {
        console.error("Failed to load test data:", error);
    } finally {
        setTestLoading(false);
    }
  };

  if (!chatId && messages.length === 0) {
    return (
      <div className="chat-window">
        <div className="no-chat-selected">
            {showTestButton && (
                <button className="test-data-btn" onClick={handleLoadTestData}>
                    <FiClipboard />
                    <span>Load Test Data</span>
                </button>
            )}
            <FiMessageSquare className="no-chat-selected-icon" />
            <h2>Select a chat or create a new one to start messaging</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* <header className="chat-header">
        <span>Edu Assistant Chat App</span>
        {showTestButton && (
            <button className="test-data-btn header" onClick={handleLoadTestData}>
                <FiClipboard />
                <span>Test UI</span>
            </button>
        )}
      </header> */}
      <div className="messages-container">
        {loading ? (
          <div className="loading-placeholder">Loading...</div>
        ) : showWelcome ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">
              <FiMessageSquare />
            </div>
            <h1>How Can I Help You Today?</h1>
            <p>Ready when you are.</p>
          </div>
        ) : (
          messages.map(msg => <Message key={msg.id} message={msg} />)
        )}
        {isThinking && <ThinkingIndicator />}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder={isPreparingChat ? "Preparing chat..." : "Type your message..."}
          value={inputValue}
          disabled={isPreparingChat}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="send-btn" disabled={!inputValue.trim() || isPreparingChat}>
          <FiSend />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
