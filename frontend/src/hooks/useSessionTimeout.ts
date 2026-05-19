import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TIMEOUT_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const ACTIVITY_KEY = 'lastActivity';

export const useSessionTimeout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(ACTIVITY_KEY);
    // Dispatch a storage event so other components (like Navbar) update immediately
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only set the timer if we are logged in
    const token = localStorage.getItem('token');
    if (token) {
      timeoutRef.current = setTimeout(() => {
        // Double check activity in case another tab updated it
        const lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0');
        const now = Date.now();
        if (now - lastActivity >= TIMEOUT_DURATION) {
          logout();
        } else {
          // Another tab was active, restart timer with remaining time
          const remaining = TIMEOUT_DURATION - (now - lastActivity);
          timeoutRef.current = setTimeout(logout, remaining);
        }
      }, TIMEOUT_DURATION);
    }
  }, [logout]);

  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => {
      localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
      resetTimer();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVITY_KEY) {
        resetTimer();
      }
      if (e.key === 'token' && !e.newValue) {
        // Token was removed in another tab
        logout();
      }
    };

    // Add listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    window.addEventListener('storage', handleStorageChange);

    // Initial timer set
    resetTimer();

    return () => {
      // Cleanup listeners
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer, location.pathname, logout]);
 // Reset timer on route change as well

  return { resetTimer };
};
