import React, { useEffect, useState } from 'react';
import { FiPlus, FiTrash2, FiMessageSquare, FiMenu, FiX, FiAlertTriangle, FiEdit2, FiSave } from 'react-icons/fi';
import './Sidebar.css';
import type { Chat } from '../../api/chatApi';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => Promise<void> | void;
  loading: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  loading,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chatPendingDelete, setChatPendingDelete] = useState<Chat | null>(null);
  const [chatPendingRename, setChatPendingRename] = useState<Chat | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (!chatPendingDelete && !chatPendingRename) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setChatPendingDelete(null);
        setChatPendingRename(null);
        setRenameError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatPendingDelete, chatPendingRename]);

  const handleDeleteRequest = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation(); // Prevent chat selection when deleting
    setChatPendingDelete(chat);
  };

  const handleConfirmDelete = () => {
    if (!chatPendingDelete) return;

    onDeleteChat(chatPendingDelete.id);
    setChatPendingDelete(null);
  };

  const handleRenameRequest = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setChatPendingRename(chat);
    setRenameValue(chat.title);
    setRenameError(null);
  };

  const handleRenameCancel = () => {
    if (renaming) return;

    setChatPendingRename(null);
    setRenameValue('');
    setRenameError(null);
  };

  const handleConfirmRename = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chatPendingRename || renaming) return;

    const normalizedTitle = renameValue.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!normalizedTitle) {
      setRenameError('Please enter a chat name.');
      return;
    }

    if (normalizedTitle === chatPendingRename.title) {
      handleRenameCancel();
      return;
    }

    try {
      setRenaming(true);
      setRenameError(null);
      await onRenameChat(chatPendingRename.id, normalizedTitle);
      setChatPendingRename(null);
      setRenameValue('');
    } catch (error) {
      console.error('Failed to rename chat:', error);
      setRenameError('Failed to rename this chat. Please try again.');
    } finally {
      setRenaming(false);
    }
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
                    <div className="chat-actions">
                      <button
                        className="chat-action-btn rename-chat-btn"
                        onClick={(e) => handleRenameRequest(e, chat)}
                        aria-label={`Rename ${chat.title}`}
                      >
                        <FiEdit2 size={15} />
                      </button>
                      <button
                        className="chat-action-btn delete-chat-btn"
                        onClick={(e) => handleDeleteRequest(e, chat)}
                        aria-label={`Delete ${chat.title}`}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
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

      {chatPendingRename && (
        <div className="delete-dialog-overlay" role="presentation" onClick={handleRenameCancel}>
          <form
            className="delete-dialog rename-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-chat-title"
            onSubmit={handleConfirmRename}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rename-dialog-icon">
              <FiEdit2 />
            </div>
            <div className="delete-dialog-copy">
              <h2 id="rename-chat-title">Rename Chat</h2>
              <p>Choose a short name for this conversation.</p>
            </div>
            <label className="rename-dialog-label" htmlFor="rename-chat-input">
              Chat name
            </label>
            <input
              id="rename-chat-input"
              className="rename-dialog-input"
              value={renameValue}
              onChange={(event) => {
                setRenameValue(event.target.value);
                setRenameError(null);
              }}
              maxLength={80}
              autoFocus
              disabled={renaming}
            />
            <div className="rename-dialog-meta">{renameValue.trim().length}/80</div>
            {renameError && <div className="rename-dialog-error">{renameError}</div>}
            <div className="delete-dialog-actions">
              <button type="button" className="delete-dialog-cancel" onClick={handleRenameCancel} disabled={renaming}>
                Cancel
              </button>
              <button type="submit" className="rename-dialog-confirm" disabled={renaming}>
                <FiSave size={16} />
                <span>{renaming ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default Sidebar;
