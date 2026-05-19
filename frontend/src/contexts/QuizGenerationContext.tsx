import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type GeneratedQuestion =
  | {
      type: 'mcq';
      question: string;
      options?: string[];
      answer: number;
    }
  | {
      type: 'short';
      question: string;
      options?: string[];
      answer: string;
    };

export type GeneratedQuiz = {
  title: string;
  description: string;
  questions: GeneratedQuestion[];
};

export type QuizGenerationMode = 'draft' | 'quick';
export type QuizGenerationStatus = 'running' | 'completed' | 'failed';

export type QuizGenerationJob = {
  id: string;
  mode: QuizGenerationMode;
  topic: string;
  numQuestions: number;
  status: QuizGenerationStatus;
  progress: number;
  startedAt: number;
  completedAt?: number;
  result?: GeneratedQuiz;
  error?: string;
};

type StartQuizGenerationInput = {
  mode: QuizGenerationMode;
  topic: string;
  numQuestions: number;
};

type QuizGenerationContextValue = {
  activeJob: QuizGenerationJob | null;
  startQuizGeneration: (input: StartQuizGenerationInput) => string | null;
  clearQuizGeneration: () => void;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const QuizGenerationContext = createContext<QuizGenerationContextValue | undefined>(undefined);

const makeJobId = () => `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === 'string' && payload.detail.trim()) {
      return payload.detail;
    }
  } catch {
    // Use the default below when the backend does not return JSON.
  }

  return 'Failed to generate quiz.';
};

export const QuizGenerationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeJob, setActiveJob] = useState<QuizGenerationJob | null>(null);
  const activeJobRef = useRef<QuizGenerationJob | null>(null);

  useEffect(() => {
    activeJobRef.current = activeJob;
  }, [activeJob]);

  useEffect(() => {
    if (activeJob?.status !== 'running') {
      return;
    }

    const progressTimer = window.setInterval(() => {
      setActiveJob((currentJob) => {
        if (!currentJob || currentJob.id !== activeJob.id || currentJob.status !== 'running') {
          return currentJob;
        }

        if (currentJob.progress >= 94) {
          return currentJob;
        }

        const remaining = 94 - currentJob.progress;
        const step = Math.max(1, Math.ceil(remaining * 0.08));

        return {
          ...currentJob,
          progress: Math.min(94, currentJob.progress + step),
        };
      });
    }, 420);

    return () => window.clearInterval(progressTimer);
  }, [activeJob?.id, activeJob?.status]);

  const runGeneration = useCallback(async (jobId: string, input: StartQuizGenerationInput) => {
    try {
      const response = await fetch(`${API_BASE}/quizzes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: input.topic,
          num_questions: input.numQuestions,
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result = (await response.json()) as GeneratedQuiz;
      setActiveJob((currentJob) => {
        if (!currentJob || currentJob.id !== jobId) {
          return currentJob;
        }

        return {
          ...currentJob,
          status: 'completed',
          progress: 100,
          completedAt: Date.now(),
          result,
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate quiz.';

      setActiveJob((currentJob) => {
        if (!currentJob || currentJob.id !== jobId) {
          return currentJob;
        }

        return {
          ...currentJob,
          status: 'failed',
          progress: 0,
          completedAt: Date.now(),
          error: errorMessage,
        };
      });
    }
  }, []);

  const startQuizGeneration = useCallback((input: StartQuizGenerationInput) => {
    if (activeJobRef.current?.status === 'running') {
      return null;
    }

    const jobId = makeJobId();
    const newJob: QuizGenerationJob = {
      id: jobId,
      mode: input.mode,
      topic: input.topic,
      numQuestions: input.numQuestions,
      status: 'running',
      progress: 6,
      startedAt: Date.now(),
    };

    setActiveJob(newJob);
    void runGeneration(jobId, input);

    return jobId;
  }, [runGeneration]);

  const clearQuizGeneration = useCallback(() => {
    setActiveJob(null);
  }, []);

  const value = useMemo(
    () => ({
      activeJob,
      startQuizGeneration,
      clearQuizGeneration,
    }),
    [activeJob, clearQuizGeneration, startQuizGeneration]
  );

  return (
    <QuizGenerationContext.Provider value={value}>
      {children}
    </QuizGenerationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useQuizGeneration = () => {
  const context = useContext(QuizGenerationContext);

  if (!context) {
    throw new Error('useQuizGeneration must be used within a QuizGenerationProvider');
  }

  return context;
};
