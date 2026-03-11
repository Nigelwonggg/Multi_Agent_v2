import React from 'react';
import { Outlet } from 'react-router-dom';

const VectorDatabasePage: React.FC = () => {
  return (
    <div className="vector-database-page">
      <Outlet />
    </div>
  );
};

export default VectorDatabasePage;
