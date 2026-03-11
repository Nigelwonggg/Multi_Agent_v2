import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTextDocument } from '../api/textStoreApi';
import './AddDocumentPage.css';

const AddDocumentPage: React.FC = () => {
  const navigate = useNavigate();
  const [newDocument, setNewDocument] = useState({
    summary_text: '',
    raw_text: '',
    category: '',
    filename: '',
    page_number: null as number | null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewDocument(prevDoc => {
      if (name === 'page_number') {
        return { ...prevDoc, [name]: value === '' ? null : Number(value) };
      }
      return { ...prevDoc, [name]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createTextDocument(newDocument);
      alert('Document added successfully!');
      navigate('/vector-database/text-store'); // Navigate back to the text store page
    } catch (err) {
      console.error('Failed to add document:', err);
      setError('Failed to add document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/vector-database/text-store'); // Go back to the text store page
  };

  return (
    <div className="add-document-container">
      <h1>Add New Document</h1>
      <form onSubmit={handleSubmit} className="add-document-form">
        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <input type="text" id="category" name="category" value={newDocument.category} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="filename">Filename:</label>
          <input type="text" id="filename" name="filename" value={newDocument.filename} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="page_number">Page Number:</label>
          <input type="number" id="page_number" name="page_number" value={newDocument.page_number ?? ''} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="summary_text">Summary Text:</label>
          <textarea id="summary_text" name="summary_text" value={newDocument.summary_text} onChange={handleChange} rows={10}></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="raw_text">Raw Text:</label>
          <textarea id="raw_text" name="raw_text" value={newDocument.raw_text} onChange={handleChange} rows={15}></textarea>
        </div>
        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Adding...' : 'Submit'}
          </button>
          <button type="button" className="cancel-btn" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
};

export default AddDocumentPage;
