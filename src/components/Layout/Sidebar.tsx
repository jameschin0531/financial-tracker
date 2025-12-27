import React from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'assets', label: 'Assets', icon: '💰' },
    { id: 'liabilities', label: 'Liabilities', icon: '💳' },
    { id: 'cashflow', label: 'Monthly Cash Flow', icon: '📈' },
    { id: 'stocks', label: 'Stock Tracker', icon: '📈' },
    { id: 'crypto', label: 'Crypto Tracker', icon: '₿' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Financial Tracker</h2>
      </div>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                className={`${styles.navItem} ${currentPage === item.id ? styles.active : ''}`}
                onClick={() => onPageChange(item.id)}
                aria-current={currentPage === item.id ? 'page' : undefined}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;

