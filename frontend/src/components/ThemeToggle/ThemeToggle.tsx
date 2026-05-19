import { FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '../../hooks/useTheme';

const ThemeToggle = () => {
  const { isLightTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${isLightTheme ? 'dark' : 'light'} theme`}
      aria-pressed={isLightTheme}
      onClick={toggleTheme}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <FiMoon className="theme-toggle__icon theme-toggle__icon--moon" />
        <FiSun className="theme-toggle__icon theme-toggle__icon--sun" />
        <span className="theme-toggle__thumb">
          {isLightTheme ? <FiSun /> : <FiMoon />}
        </span>
      </span>
      <span className="theme-toggle__text">{isLightTheme ? 'Light' : 'Dark'}</span>
    </button>
  );
};

export default ThemeToggle;
