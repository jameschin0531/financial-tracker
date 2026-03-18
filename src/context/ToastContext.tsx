import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastIdCounter = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastIdCounter;
    const toast: Toast = { id, message, type };

    setToasts((prev) => {
      const next = [...prev, toast];
      // Keep max 3 visible toasts
      return next.length > 3 ? next.slice(-3) : next;
    });

    // Start exit animation after 2.7s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
    }, 2700);

    // Remove after 3s (animation finishes)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// Internal component
const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}
          style={{
            pointerEvents: 'auto',
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderLeft: `3px solid ${
              toast.type === 'success' ? 'var(--success-color)' :
              toast.type === 'error' ? 'var(--danger-color)' :
              'var(--accent-color)'
            }`,
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            fontWeight: 500,
            boxShadow: '0 8px 32px var(--shadow)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            minWidth: '260px',
            maxWidth: '400px',
            animation: toast.exiting
              ? 'toastSlideOut 0.3s ease forwards'
              : 'toastSlideIn 0.3s ease forwards',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>
            {toast.type === 'success' ? '✓' :
             toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  );
};
