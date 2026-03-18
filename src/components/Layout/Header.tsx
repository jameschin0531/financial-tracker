import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAmountVisibility } from '../../context/AmountVisibilityContext';
import ThemeToggle from './ThemeToggle';
import ExportButton from '../Export/ExportButton';
import styles from './Header.module.css';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, signOut } = useAuth();
  const { hideAmounts, toggleAmountVisibility } = useAmountVisibility();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      setSigningOut(false);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.headerLeft}>
          <button className={styles.menuButton} onClick={onMenuClick} aria-label="Toggle menu">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className={styles.headerActions}>
          {user && (
            <div className={styles.userInfo}>
              <span className={styles.userEmail}>{user.email}</span>
              <button 
                className={styles.signOutButton}
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          )}
          <div className={styles.exportAction}>
            <ExportButton />
          </div>
          <button
            className={styles.visibilityToggle}
            onClick={toggleAmountVisibility}
            aria-label={hideAmounts ? 'Show all amounts' : 'Hide all amounts'}
            title={hideAmounts ? 'Show all amounts' : 'Hide all amounts'}
          >
            {hideAmounts ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 5.5c-4.83 0-8.95 2.93-10.7 7.07a1.2 1.2 0 000 .86C3.05 17.57 7.17 20.5 12 20.5c1.91 0 3.71-.46 5.28-1.28l2.15 2.15a.8.8 0 101.13-1.13l-16-16A.8.8 0 103.43 5.37l2.05 2.05A12.72 12.72 0 001.9 12.57a2.8 2.8 0 000 1.86C3.87 18.95 7.97 22.1 12 22.1c2.35 0 4.55-.65 6.43-1.79l1.94 1.94a.8.8 0 101.13-1.13l-16-16A.8.8 0 104.37 6.25l2.31 2.31A8.1 8.1 0 0012 17.9a8 8 0 003.7-.9l1.41 1.41A10.68 10.68 0 0112 20.5c-4.2 0-7.81-2.53-9.39-6.1a.9.9 0 010-.74C4.19 10.1 7.8 7.5 12 7.5c1.5 0 2.93.33 4.2.93l1.23 1.23A5.7 5.7 0 0012 6.3c-1.2 0-2.32.37-3.25 1.01l1.2 1.2A3.99 3.99 0 0112 8.1a4 4 0 014 4c0 .8-.24 1.54-.65 2.16l1.18 1.18A5.58 5.58 0 0017.7 12c0-.78-.16-1.53-.46-2.21l1.2 1.2c.57 1.36.57 2.9-.02 4.27l1.13 1.13A11.3 11.3 0 0022.1 13.43a2.8 2.8 0 000-1.86C20.13 8.05 16.03 4.9 12 4.9c-2.1 0-4.09.54-5.82 1.48l1.15 1.15A10.63 10.63 0 0112 5.5z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 5.5c-4.83 0-8.95 2.93-10.7 7.07a1.2 1.2 0 000 .86C3.05 17.57 7.17 20.5 12 20.5s8.95-2.93 10.7-7.07a1.2 1.2 0 000-.86C20.95 8.43 16.83 5.5 12 5.5zm0 13.4c-4.2 0-7.81-2.53-9.39-6.1a.9.9 0 010-.74C4.19 8.5 7.8 5.9 12 5.9s7.81 2.6 9.39 6.16a.9.9 0 010 .74c-1.58 3.57-5.19 6.1-9.39 6.1zm0-10.8A4.7 4.7 0 1012 17.5 4.7 4.7 0 0012 8.1zm0 7.8a3.1 3.1 0 113.1-3.1 3.1 3.1 0 01-3.1 3.1z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;

