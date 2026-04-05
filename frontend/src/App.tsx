import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './pages/Layout';
import ChatPage from './pages/ChatPage';
import DummyPage from './pages/DummyPage';
import ChatWindow from './components/ChatWindow/ChatWindow';

import EditDocumentPage from './pages/EditDocumentPage';
import AddDocumentPage from './pages/AddDocumentPage';
import ImageStore from './components/ImageStore/ImageStore';
import AddImagePage from './pages/AddImagePage';
import EditImagePage from './pages/EditImagePage';
import TextStore from './components/TextStore/TextStore';
import DatabaseLayout from './pages/DatabaseLayout';
import RetrievedContentPage from './pages/RetrievedContentPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ChatWindow chatId={null} />} />
        <Route path="chat/:chatId" element={<ChatPage />} />
        <Route path="dummy" element={<DummyPage />} />
      </Route>
      <Route path="/vector-database" element={<DatabaseLayout />}>
        <Route index element={<Navigate to="text-store" />} />
        <Route path="text-store" element={<TextStore />} />
        <Route path="text-store/add" element={<AddDocumentPage />} />
        <Route path="text-store/edit/:docId" element={<EditDocumentPage />} />
        <Route path="image-store" element={<ImageStore />} />
        <Route path="image-store/add" element={<AddImagePage />} />
        <Route path="image-store/edit/:docId" element={<EditImagePage />} />
      </Route>
      <Route path="/retrieved-content" element={<RetrievedContentPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
