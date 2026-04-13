import React, { createContext, useContext, useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  toasts: never[];
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'info':
        toast.info(message);
        break;
    }
  }, []);

  return (
    <ToastContext.Provider value={{ toasts: [], showToast }}>
      {children}
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
