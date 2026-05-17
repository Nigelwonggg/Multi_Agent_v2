import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePdfUpload } from '../../contexts/PdfUploadContext';
import './UploadStatusBar.css';

const UploadStatusBar: React.FC = () => {
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const { 
    uploadJobs, 
    activeJobId, 
    isStatusBarVisible, 
    setStatusBarVisible,
    clearJob
  } = usePdfUpload();

  const job = activeJobId ? uploadJobs[activeJobId] : null;
  const isProcessing = job?.status === 'queued' || job?.status === 'processing';
  
  // Progress calculation
  const progressPercent = job && job.total_pages > 0 
    ? Math.min(Math.round((job.processed_pages / job.total_pages) * 100), 100)
    : 0;

  useEffect(() => {
    if (!job) {
      setDisplayedProgress(0);
      return;
    }

    if (job.status === 'completed') {
      setDisplayedProgress(100);
      return;
    }

    setDisplayedProgress(Math.min(progressPercent, 95));
  }, [job?.job_id, job?.status]);

  useEffect(() => {
    if (!job) {
      setDisplayedProgress(0);
      return;
    }

    if (job.status === 'failed') {
      return;
    }

    const intervalId = window.setInterval(() => {
      setDisplayedProgress((current) => {
        if (job.status === 'completed') {
          if (current >= 99.5) return 100;
          const step = Math.max(1.2, (100 - current) * 0.12);
          return Math.min(100, current + step);
        }

        const fallbackTarget = job.status === 'queued' ? 8 : 88;
        const target = progressPercent > 0
          ? Math.min(progressPercent, 95)
          : fallbackTarget;

        if (current < target) {
          const step = Math.max(0.7, (target - current) * 0.08);
          return Math.min(target, current + step);
        }

        if (job.status === 'processing' && current < 95) {
          return Math.min(95, current + 0.12);
        }

        return current;
      });
    }, 220);

    return () => window.clearInterval(intervalId);
  }, [job, progressPercent]);

  const visibleProgressPercent = Math.round(displayedProgress);

  if (!job || !isStatusBarVisible) {
    if (job && !isStatusBarVisible) {
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
  
  return (
    <div className={`upload-status-bar ${job.status}`}>
      <div className="status-bar-content">
        <div className="status-info">
          <span className="status-label">
            {isProcessing ? `Ingesting PDF (${visibleProgressPercent}%)` : job.status === 'completed' ? 'Upload Complete' : 'Upload Failed'}
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
          style={{ width: `${visibleProgressPercent}%` }}
        ></div>
      </div>}
    </div>
  );
};

export default UploadStatusBar;
