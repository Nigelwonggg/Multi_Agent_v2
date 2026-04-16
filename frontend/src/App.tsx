import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './pages/Layout';
import ChatPage from './pages/ChatPage';
import DummyPage from './pages/DummyPage';
import ChatWindow from './components/ChatWindow/ChatWindow';
import HomePage from './pages/HomePage';

import EditDocumentPage from './pages/EditDocumentPage';
import AddDocumentPage from './pages/AddDocumentPage';
import UploadPdfPage from './pages/UploadPdfPage';
import ImageStore from './components/ImageStore/ImageStore';
import AddImagePage from './pages/AddImagePage';
import EditImagePage from './pages/EditImagePage';
import TextStore from './components/TextStore/TextStore';
import DatabaseLayout from './pages/DatabaseLayout';
import RetrievedContentPage from './pages/RetrievedContentPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Simple component to protect routes
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/upload-pdf" element={
        <ProtectedRoute allowedRoles={['lecturer']}>
          <UploadPdfPage />
        </ProtectedRoute>
      } />

      <Route path="/vector-database/upload-pdf" element={<Navigate to="/upload-pdf" replace />} />
      <Route path="/vector-database/text-store/upload" element={<Navigate to="/upload-pdf" replace />} />
      
      <Route path="/chat" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<ChatWindow chatId={null} />} />
        <Route path=":chatId" element={<ChatPage />} />
        <Route path="dummy" element={<DummyPage />} />
      </Route>

      <Route path="/vector-database" element={
        <ProtectedRoute allowedRoles={['lecturer']}>
          <DatabaseLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="text-store" />} />
        <Route path="text-store" element={<TextStore />} />
        <Route path="text-store/add" element={<AddDocumentPage />} />
        <Route path="text-store/edit/:docId" element={<EditDocumentPage />} />
        <Route path="image-store" element={<ImageStore />} />
        <Route path="image-store/add" element={<AddImagePage />} />
        <Route path="image-store/edit/:docId" element={<EditImagePage />} />
      </Route>

      <Route path="/retrieved-content" element={
        <ProtectedRoute>
          <RetrievedContentPage />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
