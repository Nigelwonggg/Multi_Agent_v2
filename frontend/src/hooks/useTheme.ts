import { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'app-theme';
const THEME_TRANSITION_CLASS = 'theme-transitioning';

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'dark' || value === 'light';

const getSavedTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(savedTheme) ? savedTheme : 'dark';
};

const applyTheme = (theme: ThemeMode) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
};

export const initializeTheme = () => {
  applyTheme(getSavedTheme());
};

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => getSavedTheme());

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.add(THEME_TRANSITION_CLASS);

    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));

    window.setTimeout(() => {
      root.classList.remove(THEME_TRANSITION_CLASS);
    }, 650);
  };

  return {
    isLightTheme: theme === 'light',
    theme,
    toggleTheme,
  };
};
