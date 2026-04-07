import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiPlus, FiTrash2, FiMessageSquare, FiMenu, FiX, FiDatabase } from 'react-icons/fi';
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
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  const handleDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // Prevent chat selection when deleting
    if (window.confirm('Are you sure you want to delete this chat?')) {
      onDeleteChat(chatId);
    }
  };

  return (
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
                  <button className="delete-chat-btn" onClick={(e) => handleDelete(e, chat.id)}>
                    <FiTrash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="sidebar-footer">
         {user?.role === 'lecturer' && (
           <NavLink to="/vector-database" className="dummy-link" title="Vector Databases" target="_blank" rel="noopener noreferrer">
              <FiDatabase size={20} />
             {!isCollapsed && <span>Vector Databases</span>}
           </NavLink>
         )}
      </div>
    </div>
  );
};

export default Sidebar;
