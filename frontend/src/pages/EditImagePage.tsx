import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getImageDocument, updateImageDocument } from '../api/imageStoreApi';
import type { ImageDocument } from '../api/imageStoreApi';
import './EditImagePage.css';

const EditImagePage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<ImageDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!docId) {
        setError('Document ID is missing.');
        setLoading(false);
        return;
      }
      try {
        const fetchedDoc = await getImageDocument(docId);
        setDocument(fetchedDoc);
      } catch (err) {
        console.error('Failed to fetch image document:', err);
        setError('Failed to load image document. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
  }, [docId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

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

    setLoading(true);
    setError(null);

    let imageBase64 = document.image_base64;
    let filename = document.filename;

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        imageBase64 = (reader.result as string).split(',')[1];
        filename = selectedFile.name;
        try {
          await updateImageDocument(docId, {
            image_base64: imageBase64,
            image_summary: document.image_summary,
            category: document.category,
            filename: filename,
            page_number: document.page_number,
          });
          alert('Image document updated successfully!');
          navigate('/vector-database/image-store');
        } catch (err) {
          console.error('Failed to update image document:', err);
          setError('Failed to update image document. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } else {
      try {
        await updateImageDocument(docId, {
          image_summary: document.image_summary,
          category: document.category,
          filename: document.filename,
          page_number: document.page_number,
        });
        alert('Image document updated successfully!');
        navigate('/vector-database/image-store');
      } catch (err) {
        console.error('Failed to update image document:', err);
        setError('Failed to update image document. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    navigate('/vector-database/image-store'); // Go back to the image store page
  };

  if (loading) {
    return <div className="edit-image-container">Loading image document...</div>;
  }

  if (error) {
    return <div className="edit-image-container error-message">{error}</div>;
  }

  if (!document) {
    return <div className="edit-image-container">Image document not found.</div>;
  }

  return (
    <div className="edit-image-container">
      <h1>Edit Image Document</h1>
      <form onSubmit={handleSubmit} className="edit-image-form">
        <div className="form-group">
          <label htmlFor="doc_id">Document ID:</label>
          <input type="text" id="doc_id" name="doc_id" value={document.doc_id} disabled />
        </div>
        <div className="form-group">
          <label htmlFor="current_image">Current Image:</label>
          {document.image_base64 ? (
            <img src={`data:image/jpeg;base64,${document.image_base64}`} alt="Current Document Image" className="current-document-image" />
          ) : (
            <span>No Image Available</span>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="image_file">Upload New Image (optional):</label>
          <input type="file" id="image_file" accept="image/*" onChange={handleFileChange} />
          {selectedFile && <p>New file selected: {selectedFile.name}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="image_summary">Image Summary:</label>
          <textarea id="image_summary" name="image_summary" value={document.image_summary} onChange={handleChange} rows={5} className="summary-textarea"></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <input type="text" id="category" name="category" value={document.category ?? ''} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="filename">Filename:</label>
          <input type="text" id="filename" name="filename" value={document.filename ?? ''} onChange={handleChange} disabled={!!selectedFile} />
        </div>
        <div className="form-group">
          <label htmlFor="page_number">Page Number:</label>
          <input type="number" id="page_number" name="page_number" value={document.page_number ?? ''} onChange={handleChange} />
        </div>
        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Updating...' : 'Submit'}
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

export default EditImagePage;
