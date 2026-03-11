import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message as MessageType } from '../../api/chatApi';
import MessageMetadata from './MessageMetadata';
import './Message.css';

interface TextMessageProps {
  message: MessageType;
}

const TextMessage: React.FC<TextMessageProps> = ({ message }) => {
  return (
    <div className="message-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
      {message.metadata && <MessageMetadata metadata={message.metadata} />}
    </div>
  );
};

export default TextMessage;
