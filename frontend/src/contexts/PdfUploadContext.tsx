import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getPdfUploadJobStatus, type PdfUploadJobStatus } from '../api/textStoreApi';

interface PdfUploadContextType {
  uploadJobs: Record<string, PdfUploadJobStatus>;
  activeJobId: string | null;
  startTrackingJob: (jobId: string) => void;
  clearJob: (jobId: string) => void;
  isAnyJobProcessing: boolean;
  isStatusBarVisible: boolean;
  setStatusBarVisible: (visible: boolean) => void;
}

const PdfUploadContext = createContext<PdfUploadContextType | undefined>(undefined);

const POLL_INTERVAL_MS = 2000;
const RAG_ENABLED_DOMAINS_KEY = 'rag_enabled_domains';

const rememberRagDomain = (domain: string) => {
  const normalizedDomain = domain.trim().toLowerCase();
  if (!normalizedDomain) return;

  try {
    const saved = localStorage.getItem(RAG_ENABLED_DOMAINS_KEY);
    const domains = saved ? JSON.parse(saved) : [];
    const nextDomains = Array.from(new Set([...domains, normalizedDomain]));
    localStorage.setItem(RAG_ENABLED_DOMAINS_KEY, JSON.stringify(nextDomains));
  } catch {
    localStorage.setItem(RAG_ENABLED_DOMAINS_KEY, JSON.stringify([normalizedDomain]));
  }
};

export const PdfUploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [uploadJobs, setUploadJobs] = useState<Record<string, PdfUploadJobStatus>>(() => {
    const saved = localStorage.getItem('pdf_upload_jobs');
    return saved ? JSON.parse(saved) : {};
  });
  const [activeJobId, setActiveJobId] = useState<string | null>(() => {
    return localStorage.getItem('active_pdf_job_id');
  });
  const [isStatusBarVisible, setStatusBarVisible] = useState(true);

  useEffect(() => {
    localStorage.setItem('pdf_upload_jobs', JSON.stringify(uploadJobs));
  }, [uploadJobs]);

  useEffect(() => {
    if (activeJobId) {
      localStorage.setItem('active_pdf_job_id', activeJobId);
      setStatusBarVisible(true); // Auto show when new job starts
    } else {
      localStorage.removeItem('active_pdf_job_id');
    }
  }, [activeJobId]);

  const updateJobStatus = useCallback(async (jobId: string) => {
    try {
      const status = await getPdfUploadJobStatus(jobId);
      setUploadJobs((prev) => ({
        ...prev,
        [jobId]: status,
      }));

      if (status.status === 'completed' || status.status === 'failed') {
        if (status.status === 'completed') {
          rememberRagDomain(status.domain);
        }
        return true; // Finished
      }
      return false; // Still processing
    } catch (error) {
      console.error(`Failed to poll job ${jobId}:`, error);
      if (
        error instanceof Error &&
        'status' in error &&
        typeof (error as Error & { status?: number }).status === 'number' &&
        (error as Error & { status?: number }).status === 404
      ) {
        setUploadJobs((prev) => {
          const next = { ...prev };
          delete next[jobId];
          return next;
        });
        setActiveJobId((currentJobId) => (currentJobId === jobId ? null : currentJobId));
        return true;
      }
      return false;
    }
  }, []);

  useEffect(() => {
    const jobsToPoll = Object.values(uploadJobs).filter(
      (job) => job.status === 'queued' || job.status === 'processing'
    );

    if (jobsToPoll.length === 0) return;

    const pollAll = async () => {
      await Promise.all(jobsToPoll.map((job) => updateJobStatus(job.job_id)));
    };

    const intervalId = setInterval(pollAll, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [uploadJobs, updateJobStatus]);

  const startTrackingJob = (jobId: string) => {
    setActiveJobId(jobId);
    updateJobStatus(jobId);
  };

  const clearJob = (jobId: string) => {
    setUploadJobs((prev) => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
    if (activeJobId === jobId) {
      setActiveJobId(null);
    }
  };

  const isAnyJobProcessing = Object.values(uploadJobs).some(
    (job) => job.status === 'queued' || job.status === 'processing'
  );

  return (
    <PdfUploadContext.Provider
      value={{
        uploadJobs,
        activeJobId,
        startTrackingJob,
        clearJob,
        isAnyJobProcessing,
        isStatusBarVisible,
        setStatusBarVisible,
      }}
    >
      {children}
    </PdfUploadContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePdfUpload = () => {
  const context = useContext(PdfUploadContext);
  if (context === undefined) {
    throw new Error('usePdfUpload must be used within a PdfUploadProvider');
  }
  return context;
};
