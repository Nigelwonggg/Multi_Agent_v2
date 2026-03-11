import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message as MessageType } from '../../api/chatApi';
import MessageMetadata from './MessageMetadata';
import './ImageMessage.css';

interface ImageMessageProps {
  message: MessageType;
}

const ImageMessage: React.FC<ImageMessageProps> = ({ message }) => {
  return (
    <div className="image-message-content">
      <div className="text-container">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
        {message.metadata && <MessageMetadata metadata={message.metadata} />}
      </div>
      {message.imageUrl && (
        <div className="image-container">
          <img src={message.imageUrl} alt="Chat content" className="message-image" />
        </div>
      )}
    </div>
  );
};

export default ImageMessage;
