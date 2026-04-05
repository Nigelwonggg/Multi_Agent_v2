import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavBar from '../components/TopNavBar/TopNavBar';
import Navbar from '../components/Navbar/Navbar';

const DatabaseLayout: React.FC = () => {
  return (
    <div className="database-layout-container" style={{ marginTop: '64px', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <Navbar />
      <TopNavBar />
      <main className="main-content" style={{ height: 'calc(100vh - 124px)', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default DatabaseLayout;
