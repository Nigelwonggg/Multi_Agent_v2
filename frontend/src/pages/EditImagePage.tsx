import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiUpload, FiX } from 'react-icons/fi';
import { getImageDocument, updateImageDocument } from '../api/imageStoreApi';
import type { ImageDocument } from '../api/imageStoreApi';
import './EditImagePage.css';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

const getImageSrc = (imageBase64?: string | null) => {
  if (!imageBase64) {
    return null;
  }

  return imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;
};

const EditImagePage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const domain = searchParams.get('domain') || 'data_science';
  const [document, setDocument] = useState<ImageDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!docId) {
        setError('Document ID is missing.');
        setLoading(false);
        return;
      }
      try {
        const fetchedDoc = await getImageDocument(docId, domain);
        setDocument(fetchedDoc);
      } catch (err) {
        console.error('Failed to fetch image document:', err);
        setError('Failed to load image document. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
  }, [docId, domain]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setSelectedImagePreview(null);
      return;
    }

    setSelectedFile(file);
    setDocument(prevDoc => prevDoc ? { ...prevDoc, filename: file.name } : prevDoc);

    const reader = new FileReader();
    reader.onloadend = () => setSelectedImagePreview(reader.result as string);
    reader.readAsDataURL(file);
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

    setSaving(true);
    setError(null);

    let imageBase64 = document.image_base64;
    let filename = document.filename;

    try {
      if (selectedFile) {
        imageBase64 = await fileToBase64(selectedFile);
        filename = selectedFile.name;
      }

      await updateImageDocument(docId, {
        image_base64: imageBase64,
        image_summary: document.image_summary,
        category: document.category,
        filename: filename,
        page_number: document.page_number,
      }, domain);
      navigate(`/vector-database/image-store?domain=${encodeURIComponent(domain)}`);
    } catch (err) {
      console.error('Failed to update image document:', err);
      setError('Failed to update image document. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(`/vector-database/image-store?domain=${encodeURIComponent(domain)}`);
  };

  if (loading) {
    return <div className="edit-image-container edit-image-state">Loading image document...</div>;
  }

  if (error && !document) {
    return (
      <div className="edit-image-container edit-image-state">
        <button type="button" className="back-btn" onClick={handleBack}>
          <FiArrowLeft />
          <span>Back</span>
        </button>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!document) {
    return <div className="edit-image-container edit-image-state">Image document not found.</div>;
  }

  const imagePreviewSrc = selectedImagePreview || getImageSrc(document.image_base64);

  return (
    <div className="edit-image-container">
      <div className="edit-image-header">
        <button type="button" className="back-btn" onClick={handleBack}>
          <FiArrowLeft />
          <span>Back</span>
        </button>
        <div>
          <h1>Edit Image Document</h1>
          <p>{domain.replace('_', ' ')} image store</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="edit-image-form">
        <div className="form-group">
          <label htmlFor="doc_id">Document ID:</label>
          <input type="text" id="doc_id" name="doc_id" value={document.doc_id} disabled />
        </div>
        <div className="form-group">
          <label>Image Preview:</label>
          <div className="image-preview-card">
            {imagePreviewSrc ? (
              <img src={imagePreviewSrc} alt="Current document" className="current-document-image" />
            ) : (
              <span>No Image Available</span>
            )}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="image_file">Upload New Image (optional):</label>
          <input type="file" id="image_file" accept="image/*" onChange={handleFileChange} />
          {selectedFile && (
            <p className="selected-file-note">
              <FiUpload />
              <span>{selectedFile.name}</span>
            </p>
          )}
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
          <button type="button" className="cancel-btn" onClick={handleBack} disabled={saving}>
            <FiX />
            <span>Cancel</span>
          </button>
          <button type="submit" className="submit-btn" disabled={saving}>
            <FiSave />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
};

export default EditImagePage;
