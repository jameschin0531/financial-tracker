import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AmountVisibilityContextType {
  hideAmounts: boolean;
  toggleAmountVisibility: () => void;
}

const AmountVisibilityContext = createContext<AmountVisibilityContextType | undefined>(undefined);

export const AMOUNT_VISIBILITY_STORAGE_KEY = 'financialAppHideAmounts';

const getInitialHideAmounts = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  const stored = window.localStorage.getItem(AMOUNT_VISIBILITY_STORAGE_KEY);
  if (stored === 'true') {
    return true;
  }
  if (stored === 'false') {
    return false;
  }

  return true;
};

export const AmountVisibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hideAmounts, setHideAmounts] = useState<boolean>(getInitialHideAmounts);

  useEffect(() => {
    window.localStorage.setItem(AMOUNT_VISIBILITY_STORAGE_KEY, hideAmounts.toString());
  }, [hideAmounts]);

  const toggleAmountVisibility = () => {
    setHideAmounts((prev) => {
      const next = !prev;
      window.localStorage.setItem(AMOUNT_VISIBILITY_STORAGE_KEY, next.toString());
      return next;
    });
  };

  return (
    <AmountVisibilityContext.Provider value={{ hideAmounts, toggleAmountVisibility }}>
      {children}
    </AmountVisibilityContext.Provider>
  );
};

export const useAmountVisibility = (): AmountVisibilityContextType => {
  const context = useContext(AmountVisibilityContext);
  if (!context) {
    throw new Error('useAmountVisibility must be used within AmountVisibilityProvider');
  }
  return context;
};
