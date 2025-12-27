import React from 'react';
import ThemeToggle from './ThemeToggle';
import ExportButton from '../Export/ExportButton';
import styles from './Header.module.css';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <button className={styles.menuButton} onClick={onMenuClick} aria-label="Toggle menu">
          ☰
        </button>
        <div className={styles.headerActions}>
          <ExportButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;

