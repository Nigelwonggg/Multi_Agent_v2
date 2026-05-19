import { flushSync } from 'react-dom';
import { type To, useNavigate } from 'react-router-dom';

type ViewTransition = {
  finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => ViewTransition;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useSmoothNavigate = () => {
  const navigate = useNavigate();

  return (to: To) => {
    if (prefersReducedMotion()) {
      navigate(to);
      return;
    }

    const viewTransitionDocument = document as ViewTransitionDocument;

    if (!viewTransitionDocument.startViewTransition) {
      navigate(to);
      return;
    }

    viewTransitionDocument.startViewTransition(() => {
      flushSync(() => {
        navigate(to);
      });
    });
  };
};
