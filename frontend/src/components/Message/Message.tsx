import React from "react";
import type { Message as MessageType } from "../../api/chatApi";
import { FiUser } from "react-icons/fi";
import { FaRobot } from "react-icons/fa";
import TextMessage from "./TextMessage";
import ImageMessage from "./ImageMessage";
import "./Message.css";

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const { sender, imageUrl } = message;
  const isUser = sender === "user";
  const hasImage =
    !!imageUrl &&
    imageUrl !== "data:image/jpeg;base64," &&
    imageUrl !== "data:image/jpeg;base64,null" &&
    imageUrl !== "data:image/jpeg;base64,undefined";

  return (
    <div className={`message ${sender}`}>
      <div className="avatar">{isUser ? <FiUser /> : <FaRobot />}</div>
      {hasImage ? (
        <ImageMessage message={message} />
      ) : (
        <TextMessage message={message} />
      )}
    </div>
  );
};

export default Message;
