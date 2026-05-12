import React, { useEffect, useState } from 'react';
import './IdentityRegistryPage.css';

type RegistrySummary = {
  total_count: number;
  student_count: number;
  lecturer_count: number;
  claimed_count: number;
  unclaimed_count: number;
};

type RegistryEntry = {
  id: number;
  institutional_id: string;
  full_name: string;
  role: string;
  claimed_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

type UploadResult = {
  created_count: number;
  updated_count: number;
  skipped_count: number;
  total_processed: number;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const IdentityRegistryPage: React.FC = () => {
  const [summary, setSummary] = useState<RegistrySummary | null>(null);
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [selectedRole, setSelectedRole] = useState<'student' | 'lecturer'>('student');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('token');

  const fetchWithAuth = async (url: string, options?: RequestInit) => {
    const token = getToken();
    const headers = new Headers(options?.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
  };

  const loadRegistryData = async (role: 'student' | 'lecturer') => {
    setLoading(true);
    setError('');

    try {
      const [summaryRes, entriesRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/identity-registry/summary`),
        fetchWithAuth(`${API_BASE}/identity-registry/entries?role=${encodeURIComponent(role)}&limit=100`),
      ]);

      if (!summaryRes.ok || !entriesRes.ok) {
        throw new Error('Failed to load the registry data.');
      }

      const summaryData: RegistrySummary = await summaryRes.json();
      const entriesData: RegistryEntry[] = await entriesRes.json();

      setSummary(summaryData);
      setEntries(entriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the registry data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistryData(selectedRole);
  }, [selectedRole]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!selectedFile) {
      setError('Please choose a CSV file first.');
      return;
    }

    const formData = new FormData();
    formData.append('role', selectedRole);
    formData.append('file', selectedFile);

    try {
      setUploading(true);
      const response = await fetchWithAuth(`${API_BASE}/identity-registry/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'Upload failed.');
      }

      const result = payload as UploadResult;
      setMessage(
        `Upload complete. ${result.created_count} created, ${result.updated_count} updated, ${result.skipped_count} skipped.`
      );
      setSelectedFile(null);
      await loadRegistryData(selectedRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="identity-registry-page">
      <section className="identity-registry-hero">
        <div>
          <p className="identity-registry-kicker">Lecturer Settings</p>
          <h1>User Verification Registry</h1>
          <p className="identity-registry-subtitle">
            Upload approved student or lecturer IDs so new users must verify their institutional ID before they can sign up.
          </p>
        </div>
      </section>

      {summary && (
        <section className="identity-registry-summary">
          <article className="summary-card">
            <span>Total IDs</span>
            <strong>{summary.total_count}</strong>
          </article>
          <article className="summary-card">
            <span>Students</span>
            <strong>{summary.student_count}</strong>
          </article>
          <article className="summary-card">
            <span>Lecturers</span>
            <strong>{summary.lecturer_count}</strong>
          </article>
          <article className="summary-card">
            <span>Claimed</span>
            <strong>{summary.claimed_count}</strong>
          </article>
          <article className="summary-card">
            <span>Available</span>
            <strong>{summary.unclaimed_count}</strong>
          </article>
        </section>
      )}

      <section className="identity-registry-grid">
        <div className="identity-panel">
          <h2>Upload CSV</h2>
          <p className="panel-help">
            CSV format: column 1 = institutional ID, column 2 = full name. Choose whether the file belongs to students or lecturers before uploading.
          </p>

          <form onSubmit={handleUpload} className="identity-upload-form">
            <div className="form-group">
              <label htmlFor="registry-role">Registry Type</label>
              <select
                id="registry-role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'student' | 'lecturer')}
                disabled={uploading}
              >
                <option value="student">Student IDs</option>
                <option value="lecturer">Lecturer IDs</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="registry-file">CSV File</label>
              <input
                id="registry-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={uploading}
              />
            </div>

            {selectedFile && <p className="selected-file">Selected: {selectedFile.name}</p>}
            {message && <div className="status-message success">{message}</div>}
            {error && <div className="status-message error">{error}</div>}

            <button type="submit" className="upload-button" disabled={uploading || !selectedFile}>
              {uploading ? 'Uploading...' : 'Upload Registry CSV'}
            </button>
          </form>
        </div>

        <div className="identity-panel">
          <div className="panel-header">
            <h2>Registered IDs</h2>
            <span className="panel-chip">{selectedRole}</span>
          </div>

          {loading ? (
            <p className="panel-help">Loading registry entries...</p>
          ) : entries.length === 0 ? (
            <p className="panel-help">No IDs uploaded for this role yet.</p>
          ) : (
            <div className="registry-table-wrapper">
              <table className="registry-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.institutional_id}</td>
                      <td>{entry.full_name}</td>
                      <td>
                        <span className={`status-pill ${entry.claimed_by_user_id ? 'claimed' : 'available'}`}>
                          {entry.claimed_by_user_id ? 'Claimed' : 'Available'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default IdentityRegistryPage;
