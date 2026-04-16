import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getTextDocument, updateTextDocument } from '../api/textStoreApi';
import type { TextDocument } from '../api/textStoreApi';
import './EditDocumentPage.css';

const EditDocumentPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const domain = searchParams.get('domain') || 'data_science';
  const [document, setDocument] = useState<TextDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!docId) {
        setError('Document ID is missing.');
        setLoading(false);
        return;
      }
      try {
        const fetchedDoc = await getTextDocument(docId, domain);
        setDocument(fetchedDoc);
      } catch (err) {
        console.error('Failed to fetch document:', err);
        setError('Failed to load document. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
  }, [docId, domain]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDocument(prevDoc => {
      if (!prevDoc) return null;
      if (name === 'page_number') {
        return { ...prevDoc, [name]: value === '' ? null : Number(value) };
      }
      return { ...prevDoc, [name]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !docId) return;

    try {
      await updateTextDocument(docId, {
        summary_text: document.summary_text,
        raw_text: document.raw_text,
        category: document.category,
        filename: document.filename,
        page_number: document.page_number,
      }, domain);
      alert('Document updated successfully!');
      navigate(`/vector-database/text-store?domain=${encodeURIComponent(domain)}`);
    } catch (err) {
      console.error('Failed to update document:', err);
      setError('Failed to update document. Please try again.');
    }
  };

  const handleCancel = () => {
    navigate(`/vector-database/text-store?domain=${encodeURIComponent(domain)}`);
  };

  if (loading) {
    return <div className="edit-document-container">Loading document...</div>;
  }

  if (error) {
    return <div className="edit-document-container error-message">{error}</div>;
  }

  if (!document) {
    return <div className="edit-document-container">Document not found.</div>;
  }

  return (
    <div className="edit-document-container">
      <h1>Edit Document</h1>
      <form onSubmit={handleSubmit} className="edit-document-form">
        <div className="form-group">
          <label htmlFor="doc_id">Document ID:</label>
          <input type="text" id="doc_id" name="doc_id" value={document.doc_id} disabled />
        </div>
        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <input type="text" id="category" name="category" value={document.category} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="filename">Filename:</label>
          <input type="text" id="filename" name="filename" value={document.filename} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="page_number">Page Number:</label>
          <input type="number" id="page_number" name="page_number" value={document.page_number ?? ''} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="summary_text">Summary Text:</label>
          <textarea id="summary_text" name="summary_text" value={document.summary_text} onChange={handleChange} rows={10}></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="raw_text">Raw Text:</label>
          <textarea id="raw_text" name="raw_text" value={document.raw_text} onChange={handleChange} rows={15}></textarea>
        </div>
        <div className="form-actions">
          <button type="submit" className="submit-btn">Submit</button>
          <button type="button" className="cancel-btn" onClick={handleCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default EditDocumentPage;
