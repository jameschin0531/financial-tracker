import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import styles from './ThemeToggle.module.css';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const showMoon = theme === 'light';

  return (
    <button
      className={styles.themeToggle}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {showMoon ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M14.2 3.3a.8.8 0 01.85 1.1 7.1 7.1 0 109.55 9.54.8.8 0 011.1.86A8.7 8.7 0 1114.2 3.3z"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 6.3A5.7 5.7 0 1112 17.7 5.7 5.7 0 0112 6.3zm0-3.8a.8.8 0 01.8.8V5a.8.8 0 11-1.6 0V3.3a.8.8 0 01.8-.8zm0 16.6a.8.8 0 01.8.8V22a.8.8 0 11-1.6 0v-2.1a.8.8 0 01.8-.8zM4.54 4.54a.8.8 0 011.13 0l1.2 1.2a.8.8 0 11-1.13 1.13l-1.2-1.2a.8.8 0 010-1.13zm12.59 12.59a.8.8 0 011.13 0l1.2 1.2a.8.8 0 01-1.13 1.13l-1.2-1.2a.8.8 0 010-1.13zM2.5 12a.8.8 0 01.8-.8h1.7a.8.8 0 010 1.6H3.3a.8.8 0 01-.8-.8zm16.5 0a.8.8 0 01.8-.8h1.7a.8.8 0 110 1.6h-1.7a.8.8 0 01-.8-.8zM5.74 17.13a.8.8 0 011.13 1.13l-1.2 1.2a.8.8 0 01-1.13-1.13l1.2-1.2zm12.59-12.59a.8.8 0 010 1.13l-1.2 1.2a.8.8 0 11-1.13-1.13l1.2-1.2a.8.8 0 011.13 0z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;

