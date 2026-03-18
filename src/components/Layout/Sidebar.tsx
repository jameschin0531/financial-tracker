import React from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

type MenuIcon = 'dashboard' | 'assets' | 'liabilities' | 'cashflow' | 'stocks' | 'crypto';

const renderIcon = (icon: MenuIcon) => {
  switch (icon) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" fill="currentColor" />
        </svg>
      );
    case 'assets':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm1 4v1.1a3 3 0 012.4 2.2.8.8 0 11-1.55.37c-.2-.86-.9-1.37-1.85-1.37-.98 0-1.73.52-1.73 1.22 0 .65.38.97 1.9 1.36 1.8.47 3.46 1.03 3.46 3.14 0 1.59-1.1 2.74-2.63 3.06V18a.8.8 0 11-1.6 0v-1.04a3.33 3.33 0 01-2.96-2.74.8.8 0 111.58-.3c.22 1.12 1.14 1.73 2.34 1.73 1.03 0 1.9-.54 1.9-1.37 0-.8-.62-1.15-2.26-1.58-1.64-.43-3.1-1.01-3.1-2.95 0-1.48 1.07-2.57 2.55-2.9V7a.8.8 0 111.6 0z" fill="currentColor" />
        </svg>
      );
    case 'liabilities':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5v-9zm2 2v5h14v-5H5zm9 1.5a1 1 0 100 2h3a1 1 0 100-2h-3z" fill="currentColor" />
        </svg>
      );
    case 'cashflow':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 18.5h16a.8.8 0 010 1.6H3.2V4a.8.8 0 011.6 0v14.5zm3.2-2.8l4.1-4.1 2.8 2.8 4.7-5a.8.8 0 111.16 1.1l-5.26 5.6a.8.8 0 01-1.16.02l-2.82-2.82-3.53 3.53a.8.8 0 11-1.13-1.13z" fill="currentColor" />
        </svg>
      );
    case 'stocks':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4.8a.8.8 0 011.6 0v12.3h13.1a.8.8 0 010 1.6H4V4.8zm13.52 2.18a.8.8 0 011.13 1.13l-3.3 3.3 1.68 1.67a.8.8 0 010 1.13l-2.58 2.59a.8.8 0 01-1.13 0l-1.84-1.84-2.03 2.03a.8.8 0 01-1.13-1.13l2.59-2.59a.8.8 0 011.13 0l1.84 1.85 1.45-1.45-1.68-1.68a.8.8 0 010-1.13l3.87-3.88z" fill="currentColor" />
        </svg>
      );
    case 'crypto':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.03 2.8a.8.8 0 01.8.8v1.02a4.54 4.54 0 013.83 3.5.8.8 0 11-1.56.36 2.96 2.96 0 00-2.96-2.3 2.56 2.56 0 00-2.74 2.25c0 1.34 1.1 1.88 3.03 2.34 2.33.56 4.27 1.37 4.27 4.08a4.1 4.1 0 01-3.87 3.98v1.02a.8.8 0 11-1.6 0v-1.05a4.55 4.55 0 01-4.14-3.75.8.8 0 111.58-.31 3.1 3.1 0 003.2 2.45 2.76 2.76 0 002.99-2.46c0-1.45-1.3-2.01-3.34-2.5-2.26-.55-3.95-1.46-3.95-3.93A4.13 4.13 0 0111.23 4.6V3.6a.8.8 0 01.8-.8z" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
};

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, collapsed = false, onToggleCollapse }) => {
  const { user } = useAuth();
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' as const },
    { id: 'assets', label: 'Assets', icon: 'assets' as const },
    { id: 'liabilities', label: 'Liabilities', icon: 'liabilities' as const },
    { id: 'cashflow', label: 'Monthly Cash Flow', icon: 'cashflow' as const },
    { id: 'stocks', label: 'Stock Tracker', icon: 'stocks' as const },
    { id: 'crypto', label: 'Crypto Tracker', icon: 'crypto' as const },
  ];

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>{collapsed ? 'FS' : 'Financial Suite'}</h2>
        {!collapsed && <p className={styles.sidebarSubtitle}>{user?.email || 'Guest'}</p>}
      </div>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                className={`${styles.navItem} ${currentPage === item.id ? styles.active : ''}`}
                onClick={() => onPageChange(item.id)}
                aria-current={currentPage === item.id ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <span className={styles.navIcon}>{renderIcon(item.icon)}</span>
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {onToggleCollapse && (
        <button
          className={styles.collapseToggle}
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
            <path d="M15 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </aside>
  );
};

export default Sidebar;
