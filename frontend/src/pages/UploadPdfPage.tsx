import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import {
  getAvailableDomains,
  uploadPdfDocument,
} from '../api/textStoreApi';
import { usePdfUpload } from '../contexts/PdfUploadContext';
import './UploadPdfPage.css';

const UploadPdfPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { uploadJobs, activeJobId, startTrackingJob, clearJob } = usePdfUpload();

  const initialDomain = useMemo(() => searchParams.get('domain') || 'data_science', [searchParams]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('general');
  const [domain, setDomain] = useState(initialDomain);
  const [domains, setDomains] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeJobStatus = useMemo(() => {
    return activeJobId ? uploadJobs[activeJobId] : null;
  }, [activeJobId, uploadJobs]);

  useEffect(() => {
    getAvailableDomains()
      .then(setDomains)
      .catch(() => setDomains(['data_science', 'medical']));
  }, []);

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
      setUploading(true);
      const response = await uploadPdfDocument(selectedFile, domain, category.trim() || 'general');
      startTrackingJob(response.job_id);
    } catch (submitErr) {
      console.error('PDF upload failed:', submitErr);
      setError(submitErr instanceof Error ? submitErr.message : 'PDF upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    navigate(`/vector-database/text-store?domain=${encodeURIComponent(domain)}`);
  };

  const isProcessing = activeJobStatus?.status === 'queued' || activeJobStatus?.status === 'processing';

  return (
    <div className="upload-pdf-page">
      <Navbar />
      <div className="upload-pdf-hero">
        <div className="hero-content">
          <h1>Knowledge Ingestion</h1>
          <p>Transform your PDF documents into searchable, AI-ready knowledge fragments.</p>
        </div>
      </div>

      <div className="upload-pdf-main">
        <div className="upload-grid">
          <section className="upload-section">
            <div className="card">
              <div className="card-header">
                <h2>Document Upload</h2>
                <p>Configure and select your PDF file</p>
              </div>
              
              <form onSubmit={handleSubmit} className="upload-pdf-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pdf-domain">Target Domain</label>
                    <div className="select-wrapper">
                      <select
                        id="pdf-domain"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        disabled={uploading || isProcessing}
                      >
                        {domains.map((item) => (
                          <option key={item} value={item}>
                            {item.replace('_', ' ').toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="pdf-category">Content Category</label>
                    <input
                      id="pdf-category"
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Machine Learning"
                      disabled={uploading || isProcessing}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>PDF Document</label>
                  <div className={`file-drop-zone ${selectedFile ? 'has-file' : ''} ${(uploading || isProcessing) ? 'disabled' : ''}`}>
                    <input
                      id="pdf-file"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      disabled={uploading || isProcessing}
                    />
                    <div className="drop-zone-content">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      {selectedFile ? (
                        <div className="file-info">
                          <span className="file-name">{selectedFile.name}</span>
                          <span className="file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                      ) : (
                        <span>Choose a PDF or drag and drop here</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="upload-actions">
                  <button type="submit" className="primary-btn" disabled={uploading || isProcessing || !selectedFile}>
                    {uploading ? (
                      <span className="btn-loading"><div className="spinner-mini"></div> Uploading...</span>
                    ) : (
                      'Initialize Ingestion'
                    )}
                  </button>
                  <button type="button" className="secondary-btn" onClick={handleBack} disabled={uploading}>
                    Back to Store
                  </button>
                </div>

                {error && <div className="error-alert">{error}</div>}
              </form>
            </div>
          </section>

          <section className="status-section">
            <div className="card">
              <div className="card-header">
                <div className="header-with-action">
                  <h2>Active Job Status</h2>
                  {activeJobStatus && (
                    <button className="text-btn" onClick={() => clearJob(activeJobStatus.job_id)}>Clear History</button>
                  )}
                </div>
                <p>Real-time processing updates</p>
              </div>

              {activeJobStatus ? (
                <div className="job-details">
                  <div className="status-hero">
                    <div className={`status-pill ${activeJobStatus.status}`}>
                      {activeJobStatus.status.toUpperCase()}
                    </div>
                    <div className="processed-counter">
                      <span className="count">
                        {activeJobStatus.total_pages > 0 
                          ? Math.min(Math.round((activeJobStatus.processed_pages / activeJobStatus.total_pages) * 100), 100)
                          : 0}%
                      </span>
                      <span className="label">OVERALL PROGRESS</span>
                    </div>
                  </div>

                  {activeJobStatus.status === 'processing' && (
                    <div className="page-progress-container">
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${activeJobStatus.total_pages > 0 ? (activeJobStatus.processed_pages / activeJobStatus.total_pages) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <div className="progress-text">
                        Processing page {activeJobStatus.processed_pages} of {activeJobStatus.total_pages}
                      </div>
                    </div>
                  )}

                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Documents</span>
                      <span className="stat-value">{activeJobStatus.created_documents}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Images Extracted</span>
                      <span className="stat-value">{activeJobStatus.created_images ?? 0}</span>
                    </div>
                    <div className="stat-item full-width">
                      <span className="stat-label">Job ID</span>
                      <span className="stat-value monospace">{activeJobStatus.job_id}</span>
                    </div>
                  </div>

                  {activeJobStatus.error && (
                    <div className="error-card">
                      <strong>Ingestion Error</strong>
                      <p>{activeJobStatus.error}</p>
                    </div>
                  )}

                  {activeJobStatus.status === 'completed' && (
                    <div className="success-footer">
                      <p>✓ Ingestion completed successfully.</p>
                      <button onClick={handleBack} className="primary-btn sm">View in Text Store</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-status">
                  <div className="empty-icon">📁</div>
                  <p>No active ingestion jobs found.</p>
                  <span>Start an upload to track its progress here.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default UploadPdfPage;
