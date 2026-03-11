import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createImageDocument } from '../api/imageStoreApi';
import './AddImagePage.css';

const AddImagePage: React.FC = () => {
  const navigate = useNavigate();
  const [newImage, setNewImage] = useState({
    image_base64: '',
    image_summary: '',
    category: '',
    filename: '',
    page_number: null as number | null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // The result is a data URL (e.g., "data:image/png;base64,iVBORw...")
        // We only need the base64 part after the comma
        const base64String = (reader.result as string).split(',')[1];
        setNewImage(prevImage => ({
          ...prevImage,
          image_base64: base64String,
          filename: file.name, // Automatically set filename from uploaded file
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewImage(prevImage => {
      if (name === 'page_number') {
        return { ...prevImage, [name]: value === '' ? null : Number(value) };
      }
      return { ...prevImage, [name]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createImageDocument(newImage);
      alert('Image document added successfully!');
      navigate('/vector-database/image-store'); // Navigate back to the image store page
    } catch (err) {
      console.error('Failed to add image document:', err);
      setError('Failed to add image document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/vector-database/image-store'); // Go back to the image store page
  };

  return (
    <div className="add-image-container">
      <h1>Add New Image Document</h1>
      <form onSubmit={handleSubmit} className="add-image-form">
        <div className="form-group">
          <label htmlFor="image_file">Upload Image:</label>
          <input type="file" id="image_file" accept="image/*" onChange={handleFileChange} />
          {newImage.image_base64 && <p>File selected: {newImage.filename}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="image_summary">Image Summary:</label>
          <textarea id="image_summary" name="image_summary" value={newImage.image_summary} onChange={handleChange} rows={5} className="summary-textarea"></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <input type="text" id="category" name="category" value={newImage.category} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="filename">Filename:</label>
          <input type="text" id="filename" name="filename" value={newImage.filename} onChange={handleChange} disabled />
        </div>
        <div className="form-group">
          <label htmlFor="page_number">Page Number:</label>
          <input type="number" id="page_number" name="page_number" value={newImage.page_number ?? ''} onChange={handleChange} />
        </div>
        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={loading || !newImage.image_base64}>
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

export default AddImagePage;
