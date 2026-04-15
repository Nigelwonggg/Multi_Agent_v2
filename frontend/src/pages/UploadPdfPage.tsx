import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import {
  getAvailableDomains,
  getPdfUploadJobStatus,
  uploadPdfDocument,
  type PdfUploadJobStatus,
} from '../api/textStoreApi';
import './UploadPdfPage.css';

const POLL_INTERVAL_MS = 1500;

const UploadPdfPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialDomain = useMemo(() => searchParams.get('domain') || 'data_science', [searchParams]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('general');
  const [domain, setDomain] = useState(initialDomain);
  const [domains, setDomains] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<PdfUploadJobStatus | null>(null);

  useEffect(() => {
    getAvailableDomains()
      .then(setDomains)
      .catch(() => setDomains(['data_science', 'medical']));
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const status = await getPdfUploadJobStatus(jobId);
        setJobStatus(status);

        if (status.status === 'completed' || status.status === 'failed') {
          window.clearInterval(intervalId);
          setLoading(false);
        }
      } catch (pollErr) {
        console.error('Failed to fetch upload status:', pollErr);
      }
    };

    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    poll();

    return () => window.clearInterval(intervalId);
  }, [jobId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Please select a PDF file first.');
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Only .pdf files are supported.');
      return;
    }

    try {
      setLoading(true);
      const response = await uploadPdfDocument(selectedFile, domain, category.trim() || 'general');
      setJobId(response.job_id);
    } catch (submitErr) {
      console.error('PDF upload failed:', submitErr);
      setError(submitErr instanceof Error ? submitErr.message : 'PDF upload failed.');
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/vector-database/text-store?domain=${encodeURIComponent(domain)}`);
  };

  return (
    <div className="upload-pdf-page">
      <Navbar />
      <div className="upload-pdf-container">
        <h1>Upload PDF to Text Store</h1>
        <p className="upload-subtitle">
          Upload a PDF and ingest its text directly into the selected domain vector store.
        </p>

        <form onSubmit={handleSubmit} className="upload-pdf-form">
          <div className="form-group">
            <label htmlFor="pdf-domain">Domain</label>
            <select
              id="pdf-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={loading}
            >
              {domains.map((item) => (
                <option key={item} value={item}>
                  {item.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="pdf-category">Category</label>
            <input
              id="pdf-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Machine Learning"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="pdf-file">PDF File</label>
            <input
              id="pdf-file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              disabled={loading}
            />
            {selectedFile && <span className="file-label">Selected: {selectedFile.name}</span>}
          </div>

          <div className="upload-actions">
            <button type="submit" className="submit-btn" disabled={loading || !selectedFile}>
              {loading ? 'Uploading...' : 'Start Upload'}
            </button>
            <button type="button" className="cancel-btn" onClick={handleBack} disabled={loading}>
              Back
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </form>

        {jobStatus && (
          <div className="job-status-card">
            <h2>Upload Status</h2>
            <p><strong>Job ID:</strong> {jobStatus.job_id}</p>
            <p><strong>Status:</strong> {jobStatus.status}</p>
            <p><strong>Processed Pages:</strong> {jobStatus.processed_pages}</p>
            <p><strong>Created Documents:</strong> {jobStatus.created_documents}</p>
            <p><strong>Created Images:</strong> {jobStatus.created_images ?? 0}</p>
            {jobStatus.error && <p className="error-message"><strong>Error:</strong> {jobStatus.error}</p>}
            {jobStatus.status === 'completed' && (
              <button type="button" className="submit-btn" onClick={handleBack}>
                Return to Text Store
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPdfPage;
