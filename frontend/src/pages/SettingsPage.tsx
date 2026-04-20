import React, { useState } from 'react';
import Navbar from '../components/Navbar/Navbar';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState('student');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/auth/upload-allowed-users?role=${role}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('csvFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        const errData = await response.json();
        setError(errData.detail || 'Upload failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="settings-container">
        <div className="settings-card">
          <h1>Admin Settings</h1>
          <section className="settings-section">
            <h2>Upload Allowed Users</h2>
            <p className="settings-description">
              Upload a CSV file containing allowed IDs and names. <br />
              <strong>Important:</strong> Start the data from the first row (no header/column titles). <br />
              Format: Column 1: ID, Column 2: Name.
            </p>
            
            <form onSubmit={handleUpload} className="upload-form">
              <div className="form-group">
                <label>Role to Upload:</label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="role-select"
                >
                  <option value="student">Students</option>
                  <option value="lecturer">Lecturers</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="csvFile">CSV File:</label>
                <input 
                  type="file" 
                  id="csvFile" 
                  accept=".csv" 
                  onChange={handleFileChange} 
                  className="file-input"
                />
              </div>

              <button 
                type="submit" 
                className="btn-accent" 
                disabled={loading || !file}
              >
                {loading ? 'Uploading...' : 'Upload CSV'}
              </button>
            </form>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
          </section>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
