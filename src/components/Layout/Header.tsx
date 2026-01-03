import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import ExportButton from '../Export/ExportButton';
import styles from './Header.module.css';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, signOut } = useAuth();
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
        <button className={styles.menuButton} onClick={onMenuClick} aria-label="Toggle menu">
          ☰
        </button>
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
          <ExportButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;

