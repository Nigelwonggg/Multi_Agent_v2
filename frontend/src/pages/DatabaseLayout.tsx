import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavBar from '../components/TopNavBar/TopNavBar';

const DatabaseLayout: React.FC = () => {
  // The handleStoreSwitch and activeStore are not needed here as TopNavBar manages its own state.
  // Keeping them commented out for now in case they are needed elsewhere or for future changes.
  // const handleStoreSwitch = (store: 'text' | 'image') => {
  //   if (store === 'text') {
  //     navigate('/vector-database/text-store');
  //   } else {
  //     navigate('/vector-database/image-store');
  //   }
  // };

  // const activeStore = location.pathname.includes('image-store') ? 'image' : 'text';

  return (
    <div className="database-layout">
      <TopNavBar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DatabaseLayout;
