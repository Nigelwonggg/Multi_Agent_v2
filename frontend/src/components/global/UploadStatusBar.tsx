import React from 'react';
import { Link } from 'react-router-dom';
import { usePdfUpload } from '../../contexts/PdfUploadContext';
import './UploadStatusBar.css';

const UploadStatusBar: React.FC = () => {
  const { 
    uploadJobs, 
    activeJobId, 
    isStatusBarVisible, 
    setStatusBarVisible,
    clearJob
  } = usePdfUpload();

  if (!activeJobId || !uploadJobs[activeJobId] || !isStatusBarVisible) {
    if (activeJobId && uploadJobs[activeJobId] && !isStatusBarVisible) {
        return (
            <button 
                className="upload-status-restore-btn"
                onClick={() => setStatusBarVisible(true)}
                title="Show Upload Status"
            >
                <div className="spinner-mini"></div>
            </button>
        );
    }
    return null;
  }

  const job = uploadJobs[activeJobId];
  const isProcessing = job.status === 'queued' || job.status === 'processing';
  
  // Progress calculation
  const progressPercent = job.total_pages > 0 
    ? Math.min(Math.round((job.processed_pages / job.total_pages) * 100), 100)
    : 0;
  
  return (
    <div className={`upload-status-bar ${job.status}`}>
      <div className="status-bar-content">
        <div className="status-info">
          <span className="status-label">
            {isProcessing ? `Ingesting PDF (${progressPercent}%)` : job.status === 'completed' ? 'Upload Complete' : 'Upload Failed'}
          </span>
          <span className="status-filename">{job.filename}</span>
          <span className="status-metrics">
             ({job.processed_pages} / {job.total_pages || '?'} pages)
          </span>
        </div>

        <div className="status-actions">
          <Link to="/upload-pdf" className="view-details-link">View Details</Link>
          {job.status === 'completed' || job.status === 'failed' ? (
              <button className="close-btn" onClick={() => clearJob(job.job_id)}>Dismiss</button>
          ) : (
              <button className="hide-btn" onClick={() => setStatusBarVisible(false)}>Hide</button>
          )}
        </div>
      </div>
      {isProcessing && <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>}
    </div>
  );
};

export default UploadStatusBar;
