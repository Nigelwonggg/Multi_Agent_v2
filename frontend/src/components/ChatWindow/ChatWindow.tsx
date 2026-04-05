import React, { useState, useEffect, useRef } from 'react';
import { getMessages, postMessage, getTestData } from '../../api/chatApi';
import type { Message as MessageType } from '../../api/chatApi';
import Message from '../Message/Message';
import { FiSend, FiMessageSquare, FiClipboard } from 'react-icons/fi';
import ThinkingIndicator from './ThinkingIndicator';
import './ChatWindow.css';

interface ChatWindowProps {
  chatId: string | null;
  showTestButton?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, showTestButton = false }) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chatId) {
      const fetchMessages = async () => {
        setLoading(true);
        try {
          const fetchedMessages = await getMessages(chatId);
          setMessages(fetchedMessages);
        } catch (error) {
          console.error("Failed to fetch messages:", error);
          setMessages([]);
        } finally {
          setLoading(false);
        }
      };
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !chatId) return;

    const userMessage: MessageType = {
        id: String(Date.now()),
        text: inputValue,
        sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    try {
      const reply_message = await postMessage(chatId, inputValue);
      setMessages(prev => [...prev.slice(0, -1), userMessage, reply_message]);
    } catch (error) {
      console.error("Failed to post message:", error);
      // Optional: handle message sending failure
    } finally {
      setIsThinking(false);
    }
  };

  const handleLoadTestData = async () => {
    setLoading(true);
    try {
        const testMessage = await getTestData();
        setMessages([testMessage]);
    } catch (error) {
        console.error("Failed to load test data:", error);
    } finally {
        setLoading(false);
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
      <header className="chat-header">
        <span>Edu Assistant Chat App</span>
        {showTestButton && (
            <button className="test-data-btn header" onClick={handleLoadTestData}>
                <FiClipboard />
                <span>Test UI</span>
            </button>
        )}
      </header>
      <div className="messages-container">
        {loading ? (
          <div className="loading-placeholder">Loading...</div>
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
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="send-btn" disabled={!inputValue.trim()}>
          <FiSend />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;