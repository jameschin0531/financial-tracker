import React, { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handlePageChange = (page: string) => {
    onPageChange(page);
    setSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  return (
    <div className={styles.layout}>
      <div className={styles.sidebarWrapper}>
        <div className={`${styles.sidebarContainer} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <Sidebar currentPage={currentPage} onPageChange={handlePageChange} />
        </div>
        {sidebarOpen && (
          <div
            className={styles.overlay}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </div>
      <div className={styles.mainContent}>
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

