import React, { useEffect, useState } from 'react';
import { FiPlus, FiTrash2, FiMessageSquare, FiMenu, FiX, FiAlertTriangle } from 'react-icons/fi';
import './Sidebar.css';
import type { Chat } from '../../api/chatApi';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id:string) => void;
  loading: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  loading,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chatPendingDelete, setChatPendingDelete] = useState<Chat | null>(null);

  useEffect(() => {
    if (!chatPendingDelete) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setChatPendingDelete(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatPendingDelete]);

  const handleDeleteRequest = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation(); // Prevent chat selection when deleting
    setChatPendingDelete(chat);
  };

  const handleConfirmDelete = () => {
    if (!chatPendingDelete) return;

    onDeleteChat(chatPendingDelete.id);
    setChatPendingDelete(null);
  };

  return (
    <>
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-main-content">
          <div className="sidebar-header">
            <button className="toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <FiMenu size={20} /> : <FiX size={20} />}
            </button>
          </div>
          <button className="new-chat-btn" onClick={onNewChat}>
            <FiPlus size={20} />
            {!isCollapsed && <span>New Chat</span>}
          </button>
          {loading ? (
            <div className="loading-placeholder">Loading chats...</div>
          ) : (
            <ul className="chat-history">
              {chats.map(chat => (
                <li
                  key={chat.id}
                  className={`chat-history-item ${activeChatId === chat.id ? 'active' : ''}`}
                  onClick={() => onSelectChat(chat.id)}
                  title={chat.title}
                >
                  <FiMessageSquare className="chat-icon" />
                  {!isCollapsed && <span className="chat-title">{chat.title}</span>}
                  {!isCollapsed && (
                    <button
                      className="delete-chat-btn"
                      onClick={(e) => handleDeleteRequest(e, chat)}
                      aria-label={`Delete ${chat.title}`}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {chatPendingDelete && (
        <div className="delete-dialog-overlay" role="presentation" onClick={() => setChatPendingDelete(null)}>
          <div
            className="delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-chat-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delete-dialog-icon">
              <FiAlertTriangle />
            </div>
            <div className="delete-dialog-copy">
              <h2 id="delete-chat-title">Delete Chat?</h2>
              <p>
                This will permanently remove <span>{chatPendingDelete.title}</span> and its messages.
              </p>
            </div>
            <div className="delete-dialog-actions">
              <button className="delete-dialog-cancel" onClick={() => setChatPendingDelete(null)}>
                Cancel
              </button>
              <button className="delete-dialog-confirm" onClick={handleConfirmDelete} autoFocus>
                <FiTrash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
