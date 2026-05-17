import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import {
  getAvailableDomains,
  uploadPdfDocument,
} from '../api/textStoreApi';
import { usePdfUpload } from '../contexts/PdfUploadContext';
import { FiUploadCloud, FiFile, FiCheckCircle, FiAlertCircle, FiTrash2, FiClock } from 'react-icons/fi';
import './UploadPdfPage.css';

const UploadPdfPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { uploadJobs, activeJobId, startTrackingJob, clearJob } = usePdfUpload();

  const initialDomain = useMemo(() => searchParams.get('domain') || 'data_science', [searchParams]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('general');
  const [domain, setDomain] = useState(initialDomain);
  const [customDomain, setCustomDomain] = useState('');
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedProgress, setDisplayedProgress] = useState(0);

  const activeJobStatus = useMemo(() => {
    return activeJobId ? uploadJobs[activeJobId] : null;
  }, [activeJobId, uploadJobs]);

  useEffect(() => {
    getAvailableDomains()
      .then(setDomains)
      .catch(() => setDomains(['data_science', 'medical']));
  }, []);

  const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'OTHER_CUSTOM_DOMAIN') {
      setShowCustomDomain(true);
      setDomain('');
    } else {
      setShowCustomDomain(false);
      setDomain(value);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please drop a valid PDF file.');
      }
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const finalDomain = showCustomDomain ? customDomain.trim().toLowerCase().replace(/\s+/g, '_') : domain;

    if (!finalDomain) {
      setError('Please select or enter a domain.');
      return;
    }

    if (!selectedFile) {
      setError('Please select a PDF file first.');
      return;
    }

    try {
      setUploading(true);
      const response = await uploadPdfDocument(selectedFile, finalDomain, category.trim() || 'general');
      startTrackingJob(response.job_id);
    } catch (submitErr) {
      console.error('PDF upload failed:', submitErr);
      setError(submitErr instanceof Error ? submitErr.message : 'PDF upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    const finalDomain = showCustomDomain ? customDomain.trim().toLowerCase().replace(/\s+/g, '_') : domain;
    navigate(`/vector-database/text-store?domain=${encodeURIComponent(finalDomain)}`);
  };

  const isProcessing = activeJobStatus?.status === 'queued' || activeJobStatus?.status === 'processing';

  const progressPercentage = useMemo(() => {
    if (!activeJobStatus || activeJobStatus.total_pages === 0) return 0;
    return Math.min(Math.round((activeJobStatus.processed_pages / activeJobStatus.total_pages) * 100), 100);
  }, [activeJobStatus]);

  useEffect(() => {
    if (!activeJobStatus) {
      setDisplayedProgress(0);
      return;
    }

    if (activeJobStatus.status === 'completed') {
      setDisplayedProgress(100);
      return;
    }

    setDisplayedProgress(Math.min(progressPercentage, 95));
  }, [activeJobStatus?.job_id, activeJobStatus?.status]);

  useEffect(() => {
    if (!activeJobStatus) {
      setDisplayedProgress(0);
      return;
    }

    if (activeJobStatus.status === 'failed') {
      return;
    }

    const intervalId = window.setInterval(() => {
      setDisplayedProgress((current) => {
        if (activeJobStatus.status === 'completed') {
          if (current >= 99.5) return 100;
          const step = Math.max(1.2, (100 - current) * 0.12);
          return Math.min(100, current + step);
        }

        const fallbackTarget = activeJobStatus.status === 'queued' ? 8 : 88;
        const target = progressPercentage > 0
          ? Math.min(progressPercentage, 95)
          : fallbackTarget;

        if (current < target) {
          const step = Math.max(0.7, (target - current) * 0.08);
          return Math.min(target, current + step);
        }

        if (activeJobStatus.status === 'processing' && current < 95) {
          return Math.min(95, current + 0.12);
        }

        return current;
      });
    }, 220);

    return () => window.clearInterval(intervalId);
  }, [activeJobStatus, progressPercentage]);

  const visibleProgressPercentage = Math.round(displayedProgress);

  return (
    <div className="upload-pdf-page">
      <Navbar />
      <div className="upload-pdf-hero">
        <div className="hero-content">
          <h1>Knowledge Ingestion</h1>
          <p>Transform your documents into searchable, AI-ready knowledge fragments using advanced layout-aware processing.</p>
        </div>
      </div>

      <div className="upload-pdf-main">
        <div className="upload-grid">
          <section className="upload-section animate-fade-in">
            <div className="card">
              <div className="card-header">
                <h2>Document Ingestion Hub</h2>
                <p>Configure your target vector database and select source documents.</p>
              </div>
              
              <form onSubmit={handleSubmit} className="upload-pdf-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pdf-domain">Target Domain</label>
                    <select
                      id="pdf-domain"
                      value={showCustomDomain ? 'OTHER_CUSTOM_DOMAIN' : domain}
                      onChange={handleDomainChange}
                      disabled={uploading || isProcessing}
                    >
                      {domains.map((item) => (
                        <option key={item} value={item}>
                          {item.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                      <option value="OTHER_CUSTOM_DOMAIN">+ CREATE NEW DOMAIN...</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="pdf-category">Content Category</label>
                    <input
                      id="pdf-category"
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Research, Documentation"
                      disabled={uploading || isProcessing}
                    />
                  </div>
                </div>

                {showCustomDomain && (
                  <div className="form-group animate-fade-in">
                    <label htmlFor="custom-domain">New Domain Identifier</label>
                    <input
                      id="custom-domain"
                      type="text"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="Enter a unique name for this domain"
                      required
                      disabled={uploading || isProcessing}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Source Document</label>
                  <div 
                    className={`file-drop-zone ${selectedFile ? 'has-file' : ''} ${isDragging ? 'dragging' : ''} ${(uploading || isProcessing) ? 'disabled' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      id="pdf-file"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => {
                        setSelectedFile(e.target.files?.[0] || null);
                        setError(null);
                      }}
                      disabled={uploading || isProcessing}
                    />
                    <div className="drop-zone-content">
                      {selectedFile ? (
                        <>
                          <FiFile size={40} />
                          <div className="file-info">
                            <span className="file-name">{selectedFile.name}</span>
                            <span className="file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <FiUploadCloud size={48} />
                          <span>Drag and drop your PDF or click to browse</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="upload-actions">
                  <button type="submit" className="primary-btn" disabled={uploading || isProcessing || !selectedFile}>
                    {uploading ? (
                      <span><div className="spinner-mini"></div> INITIALIZING...</span>
                    ) : (
                      'START INGESTION'
                    )}
                  </button>
                  <button type="button" className="secondary-btn" onClick={handleBack} disabled={uploading}>
                    GO BACK
                  </button>
                </div>

                {error && (
                  <div className="error-alert animate-fade-in">
                    <FiAlertCircle style={{ marginRight: '8px' }} />
                    {error}
                  </div>
                )}
              </form>
            </div>
          </section>

          <section className="status-section animate-fade-in">
            <div className="card">
              <div className="card-header">
                <div className="header-with-action">
                  <h2>Processing Pipeline</h2>
                  {activeJobStatus && !isProcessing && (
                    <button className="text-btn" onClick={() => clearJob(activeJobStatus.job_id)}>
                      <FiTrash2 size={14} /> CLEAR
                    </button>
                  )}
                </div>
                <p>Live status of your knowledge extraction job.</p>
              </div>

              {activeJobStatus ? (
                <div className="job-details animate-fade-in">
                  <div className="status-hero">
                    <div className={`status-pill ${activeJobStatus.status}`}>
                      {activeJobStatus.status === 'processing' && <FiClock style={{ marginRight: '6px' }} />}
                      {activeJobStatus.status.toUpperCase()}
                    </div>
                    <div className="processed-counter">
                      <span className="count">{visibleProgressPercentage}%</span>
                      <span className="label">PIPELINE PROGRESS</span>
                    </div>
                  </div>

                  {activeJobStatus.status === 'processing' && (
                    <div className="page-progress-container">
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${visibleProgressPercentage}%` }}
                        ></div>
                      </div>
                      <div className="progress-text">
                        Extracting content: page {activeJobStatus.processed_pages} of {activeJobStatus.total_pages}
                      </div>
                    </div>
                  )}

                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Text Fragments</span>
                      <span className="stat-value">{activeJobStatus.created_documents}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Visual Assets</span>
                      <span className="stat-value">{activeJobStatus.created_images ?? 0}</span>
                    </div>
                    <div className="stat-item full-width">
                      <span className="stat-label">Internal Job ID</span>
                      <span className="stat-value monospace">{activeJobStatus.job_id}</span>
                    </div>
                  </div>

                  {activeJobStatus.error && (
                    <div className="error-card animate-fade-in">
                      <strong>Ingestion Failure</strong>
                      <p>{activeJobStatus.error}</p>
                    </div>
                  )}

                  {activeJobStatus.status === 'completed' && (
                    <div className="success-footer animate-fade-in">
                      <p><FiCheckCircle /> Ingestion pipeline completed successfully.</p>
                      <button onClick={handleBack} className="primary-btn sm">VIEW KNOWLEDGE BASE</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-status">
                  <div className="empty-icon"><FiFile /></div>
                  <p>No active pipeline jobs</p>
                  <span>Uploaded documents will appear here with real-time processing stats.</span>
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
