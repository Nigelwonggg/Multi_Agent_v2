import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';
import Navbar from '../components/Navbar/Navbar';
import { useChatLogic } from '../hooks/useChatLogic';
import './Layout.css';

const Layout: React.FC = () => {
  const {
    chats,
    activeChatId,
    loading,
    handleSelectChat,
    handleNewChat,
    handleDeleteChat,
    handleRenameChat,
  } = useChatLogic();

  return (
    <>
      <Navbar />
      <div className="layout">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          loading={loading}
        />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default Layout;
