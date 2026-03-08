import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Asset, Liability, Income, Expense, FinancialData, StockHolding, CryptoHolding, TradingAccount, CryptoAccount, Deposit } from '../types/financial';
import { loadFinancialData, loadCachedFinancialData, saveCachedFinancialData, saveFinancialData } from '../services/storageService';
import { getStockPrices } from '../services/stockPriceService';
import { getCryptoPrices } from '../services/cryptoPriceService';
import { getHKDToMYRRate, getUSDToMYRRate } from '../services/exchangeRateService';
import { useAuth } from './AuthContext';
import { shouldSkipBackgroundRefresh } from './refreshGuards';

interface FinancialDataContextType {
  data: FinancialData;
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  updateAsset: (id: string, asset: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  addLiability: (liability: Omit<Liability, 'id'>) => void;
  updateLiability: (id: string, liability: Partial<Liability>) => void;
  deleteLiability: (id: string) => void;
  addIncome: (income: Omit<Income, 'id'>) => void;
  updateIncome: (id: string, income: Partial<Income>) => void;
  deleteIncome: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addAssetCategory: (category: string) => void;
  addLiabilityCategory: (category: string) => void;
  addExpenseCategory: (category: string) => void;
  // Stock tracking
  addStockHolding: (holding: Omit<StockHolding, 'id'>) => void;
  updateStockHolding: (id: string, holding: Partial<StockHolding>) => void;
  deleteStockHolding: (id: string) => void;
  updateStockPrice: (id: string, price: number) => void;
  updateStockPrices: (prices: Map<string, number>) => void;
  // Crypto tracking
  addCryptoHolding: (holding: Omit<CryptoHolding, 'id'>) => void;
  updateCryptoHolding: (id: string, holding: Partial<CryptoHolding>) => void;
  deleteCryptoHolding: (id: string) => void;
  updateCryptoPrice: (id: string, price: number) => void;
  updateCryptoPrices: (prices: Map<string, number>) => void;
  // Trading accounts (for stocks)
  addTradingAccount: (account: Omit<TradingAccount, 'id'>) => void;
  updateTradingAccount: (id: string, account: Partial<TradingAccount>) => void;
  deleteTradingAccount: (id: string) => void;
  // Crypto accounts
  addCryptoAccount: (account: Omit<CryptoAccount, 'id'>) => void;
  updateCryptoAccount: (id: string, account: Partial<CryptoAccount>) => void;
  deleteCryptoAccount: (id: string) => void;
  // Deposits
  addDeposit: (deposit: Omit<Deposit, 'id'>) => void;
  updateDeposit: (id: string, deposit: Partial<Deposit>) => void;
  deleteDeposit: (id: string) => void;
}

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getDefaultData = (): FinancialData => ({
  assets: [],
  liabilities: [],
  income: [],
  expenses: [],
  assetCategories: ['Cash', 'Savings Account', 'Checking Account', 'Investment', 'Retirement Account', 'Real Estate', 'Vehicle', 'Other'],
  liabilityCategories: ['Credit Card', 'Personal Loan', 'Mortgage', 'Auto Loan', 'Student Loan', 'Medical Debt', 'Other'],
  expenseCategories: ['Housing', 'Food', 'Transportation', 'Utilities', 'Healthcare', 'Entertainment', 'Shopping', 'Education', 'Insurance', 'Other'],
  stockHoldings: [],
  cryptoHoldings: [],
  tradingAccounts: [],
  cryptoAccounts: [],
  deposits: [],
});

const DATA_LOAD_TIMEOUT_MS = 10000;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const FinancialDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [data, setData] = useState<FinancialData>(getDefaultData());
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveInFlightRef = useRef(false);
  const initialRefreshRef = useRef<{ userId: string | null; inFlight: boolean }>({ userId: null, inFlight: false });
  const activeUserIdRef = useRef<string | null>(null);
  const loadingDataRef = useRef(false);

  const refreshDataFromServer = useCallback(async (userId: string, blockUi: boolean) => {
    if (shouldSkipBackgroundRefresh({
      blockUi,
      hasPendingSaveTimeout: saveTimeoutRef.current !== null,
      isSaveInFlight: saveInFlightRef.current,
    })) {
      return;
    }

    if (loadingDataRef.current) {
      return;
    }

    loadingDataRef.current = true;
    if (blockUi) {
      setIsLoading(true);
    }

    try {
      const loadedData = await withTimeout(
        loadFinancialData(userId),
        DATA_LOAD_TIMEOUT_MS,
        `Financial data load timed out after ${DATA_LOAD_TIMEOUT_MS}ms`,
      );

      if (activeUserIdRef.current !== userId) {
        return;
      }

      setData(loadedData);
      saveCachedFinancialData(userId, loadedData);
    } catch (error) {
      console.error('Error refreshing financial data from server:', error);
    } finally {
      if (blockUi && activeUserIdRef.current === userId) {
        setIsLoading(false);
      }
      loadingDataRef.current = false;
    }
  }, []);

  // Load data when user logs in
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        activeUserIdRef.current = null;
        // User logged out, reset to defaults
        setData(getDefaultData());
        setIsLoading(false);
        return;
      }

      activeUserIdRef.current = user.id;

      const cachedData = loadCachedFinancialData(user.id);

      if (cachedData) {
        setData(cachedData);
        setIsLoading(false);
        void refreshDataFromServer(user.id, false);
        return;
      }

      try {
        await refreshDataFromServer(user.id, true);
      } catch (error) {
        console.error('Error loading initial financial data:', error);
        setData(getDefaultData());
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, refreshDataFromServer]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleResumeRefresh = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      void refreshDataFromServer(user.id, false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleResumeRefresh();
      }
    };

    window.addEventListener('focus', handleResumeRefresh);
    window.addEventListener('online', handleResumeRefresh);
    window.addEventListener('pageshow', handleResumeRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleResumeRefresh);
      window.removeEventListener('online', handleResumeRefresh);
      window.removeEventListener('pageshow', handleResumeRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, refreshDataFromServer]);

  useEffect(() => {
    if (!user) {
      initialRefreshRef.current = { userId: null, inFlight: false };
    }
  }, [user]);

  // Refresh market prices + exchange rates once after initial load
  useEffect(() => {
    if (!user || isLoading) {
      return;
    }

    if (initialRefreshRef.current.userId === user.id || initialRefreshRef.current.inFlight) {
      return;
    }

    initialRefreshRef.current.inFlight = true;

    const refreshMarketData = async () => {
      const stockHoldings = data.stockHoldings.filter(holding => holding.stockType !== 'Cash');
      const cryptoHoldings = data.cryptoHoldings;

      if (stockHoldings.length === 0 && cryptoHoldings.length === 0) {
        return;
      }

      const [usdToMyr, hkdToMyr] = await Promise.all([
        getUSDToMYRRate(),
        getHKDToMYRRate(),
      ]);

      const stockSymbols = Array.from(new Set(stockHoldings.map(h => h.code.toUpperCase())));
      const cryptoSymbols = Array.from(new Set(cryptoHoldings.map(h => h.symbol.toUpperCase())));

      const [stockPrices, cryptoPrices] = await Promise.all([
        stockSymbols.length > 0 ? getStockPrices(stockSymbols) : Promise.resolve(new Map<string, number>()),
        cryptoSymbols.length > 0 ? getCryptoPrices(cryptoSymbols) : Promise.resolve(new Map<string, number>()),
      ]);

      setData(prev => ({
        ...prev,
        stockHoldings: prev.stockHoldings.map(holding => {
          if (holding.stockType === 'Cash') {
            return holding;
          }

          const price = stockPrices.get(holding.code.toUpperCase());
          const exchangeRate = holding.currency === 'USD'
            ? usdToMyr
            : holding.currency === 'HKD'
              ? hkdToMyr
              : undefined;

          if (price === undefined && exchangeRate === undefined) {
            return holding;
          }

          return {
            ...holding,
            marketPrice: price ?? holding.marketPrice,
            lastUpdated: price ? new Date().toISOString() : holding.lastUpdated,
            exchangeRate: exchangeRate ?? holding.exchangeRate,
          };
        }),
        cryptoHoldings: prev.cryptoHoldings.map(holding => {
          const price = cryptoPrices.get(holding.symbol.toUpperCase());
          if (price === undefined && !usdToMyr) {
            return holding;
          }

          return {
            ...holding,
            marketPrice: price ?? holding.marketPrice,
            lastUpdated: price ? new Date().toISOString() : holding.lastUpdated,
            exchangeRate: usdToMyr || holding.exchangeRate,
          };
        }),
      }));
    };

    refreshMarketData()
      .catch(error => {
        console.error('Error refreshing market data on init:', error);
      })
      .finally(() => {
        initialRefreshRef.current.userId = user.id;
        initialRefreshRef.current.inFlight = false;
      });
  }, [data.cryptoHoldings, data.stockHoldings, isLoading, user]);

  // Debounced save when data changes
  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    saveCachedFinancialData(user.id, data);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveInFlightRef.current = true;
      saveFinancialData(user.id, data)
        .catch((error) => {
          console.error('Error saving financial data:', error);
        })
        .finally(() => {
          saveInFlightRef.current = false;
        });
    }, 1000); // 1 second debounce

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [data, isLoading, user]);

  const addAsset = (asset: Omit<Asset, 'id'>) => {
    setData(prev => ({
      ...prev,
      assets: [...prev.assets, { ...asset, id: generateId() }],
    }));
  };

  const updateAsset = (id: string, asset: Partial<Asset>) => {
    setData(prev => ({
      ...prev,
      assets: prev.assets.map(a => (a.id === id ? { ...a, ...asset } : a)),
    }));
  };

  const deleteAsset = (id: string) => {
    setData(prev => ({
      ...prev,
      assets: prev.assets.filter(a => a.id !== id),
    }));
  };

  const addLiability = (liability: Omit<Liability, 'id'>) => {
    setData(prev => ({
      ...prev,
      liabilities: [...prev.liabilities, { ...liability, id: generateId() }],
    }));
  };

  const updateLiability = (id: string, liability: Partial<Liability>) => {
    setData(prev => ({
      ...prev,
      liabilities: prev.liabilities.map(l => (l.id === id ? { ...l, ...liability } : l)),
    }));
  };

  const deleteLiability = (id: string) => {
    setData(prev => ({
      ...prev,
      liabilities: prev.liabilities.filter(l => l.id !== id),
    }));
  };

  const addIncome = (income: Omit<Income, 'id'>) => {
    setData(prev => ({
      ...prev,
      income: [...prev.income, { ...income, id: generateId() }],
    }));
  };

  const updateIncome = (id: string, income: Partial<Income>) => {
    setData(prev => ({
      ...prev,
      income: prev.income.map(i => (i.id === id ? { ...i, ...income } : i)),
    }));
  };

  const deleteIncome = (id: string) => {
    setData(prev => ({
      ...prev,
      income: prev.income.filter(i => i.id !== id),
    }));
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    setData(prev => ({
      ...prev,
      expenses: [...prev.expenses, { ...expense, id: generateId() }],
    }));
  };

  const updateExpense = (id: string, expense: Partial<Expense>) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => (e.id === id ? { ...e, ...expense } : e)),
    }));
  };

  const deleteExpense = (id: string) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id),
    }));
  };

  const addAssetCategory = (category: string) => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) return;
    
    setData(prev => {
      if (prev.assetCategories.includes(trimmedCategory)) {
        return prev;
      }
      return {
        ...prev,
        assetCategories: [...prev.assetCategories, trimmedCategory],
      };
    });
  };

  const addLiabilityCategory = (category: string) => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) return;
    
    setData(prev => {
      if (prev.liabilityCategories.includes(trimmedCategory)) {
        return prev;
      }
      return {
        ...prev,
        liabilityCategories: [...prev.liabilityCategories, trimmedCategory],
      };
    });
  };

  const addExpenseCategory = (category: string) => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) return;
    
    setData(prev => {
      if (prev.expenseCategories.includes(trimmedCategory)) {
        return prev;
      }
      return {
        ...prev,
        expenseCategories: [...prev.expenseCategories, trimmedCategory],
      };
    });
  };

  // Stock Holdings
  const addStockHolding = (holding: Omit<StockHolding, 'id'>) => {
    setData(prev => ({
      ...prev,
      stockHoldings: [...prev.stockHoldings, { ...holding, id: generateId() }],
    }));
  };

  const updateStockHolding = (id: string, holding: Partial<StockHolding>) => {
    setData(prev => ({
      ...prev,
      stockHoldings: prev.stockHoldings.map(h => (h.id === id ? { ...h, ...holding } : h)),
    }));
  };

  const deleteStockHolding = (id: string) => {
    setData(prev => ({
      ...prev,
      stockHoldings: prev.stockHoldings.filter(h => h.id !== id),
    }));
  };

  const updateStockPrice = (id: string, price: number) => {
    setData(prev => ({
      ...prev,
      stockHoldings: prev.stockHoldings.map(h => 
        h.id === id ? { ...h, marketPrice: price, lastUpdated: new Date().toISOString() } : h
      ),
    }));
  };

  const updateStockPrices = (prices: Map<string, number>) => {
    if (prices.size === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    setData(prev => ({
      ...prev,
      stockHoldings: prev.stockHoldings.map(h => {
        if (h.stockType === 'Cash') {
          return h;
        }
        const price = prices.get(h.code.toUpperCase());
        return price === undefined
          ? h
          : { ...h, marketPrice: price, lastUpdated: timestamp };
      }),
    }));
  };

  // Crypto Holdings
  const addCryptoHolding = (holding: Omit<CryptoHolding, 'id'>) => {
    setData(prev => ({
      ...prev,
      cryptoHoldings: [...prev.cryptoHoldings, { ...holding, id: generateId() }],
    }));
  };

  const updateCryptoHolding = (id: string, holding: Partial<CryptoHolding>) => {
    setData(prev => ({
      ...prev,
      cryptoHoldings: prev.cryptoHoldings.map(h => (h.id === id ? { ...h, ...holding } : h)),
    }));
  };

  const deleteCryptoHolding = (id: string) => {
    setData(prev => ({
      ...prev,
      cryptoHoldings: prev.cryptoHoldings.filter(h => h.id !== id),
    }));
  };

  const updateCryptoPrice = (id: string, price: number) => {
    setData(prev => ({
      ...prev,
      cryptoHoldings: prev.cryptoHoldings.map(h => 
        h.id === id ? { ...h, marketPrice: price, lastUpdated: new Date().toISOString() } : h
      ),
    }));
  };

  const updateCryptoPrices = (prices: Map<string, number>) => {
    if (prices.size === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    setData(prev => ({
      ...prev,
      cryptoHoldings: prev.cryptoHoldings.map(h => {
        const price = prices.get(h.symbol.toUpperCase());
        return price === undefined
          ? h
          : { ...h, marketPrice: price, lastUpdated: timestamp };
      }),
    }));
  };

  // Trading Accounts
  const addTradingAccount = (account: Omit<TradingAccount, 'id'>) => {
    setData(prev => ({
      ...prev,
      tradingAccounts: [...prev.tradingAccounts, { ...account, id: generateId() }],
    }));
  };

  const updateTradingAccount = (id: string, account: Partial<TradingAccount>) => {
    setData(prev => ({
      ...prev,
      tradingAccounts: prev.tradingAccounts.map(a => (a.id === id ? { ...a, ...account } : a)),
    }));
  };

  const deleteTradingAccount = (id: string) => {
    setData(prev => ({
      ...prev,
      tradingAccounts: prev.tradingAccounts.filter(a => a.id !== id),
    }));
  };

  // Crypto Accounts
  const addCryptoAccount = (account: Omit<CryptoAccount, 'id'>) => {
    setData(prev => ({
      ...prev,
      cryptoAccounts: [...prev.cryptoAccounts, { ...account, id: generateId() }],
    }));
  };

  const updateCryptoAccount = (id: string, account: Partial<CryptoAccount>) => {
    setData(prev => ({
      ...prev,
      cryptoAccounts: prev.cryptoAccounts.map(a => (a.id === id ? { ...a, ...account } : a)),
    }));
  };

  const deleteCryptoAccount = (id: string) => {
    setData(prev => ({
      ...prev,
      cryptoAccounts: prev.cryptoAccounts.filter(a => a.id !== id),
    }));
  };

  // Deposits
  const addDeposit = (deposit: Omit<Deposit, 'id'>) => {
    setData(prev => ({
      ...prev,
      deposits: [...prev.deposits, { ...deposit, id: generateId() }],
    }));
  };

  const updateDeposit = (id: string, deposit: Partial<Deposit>) => {
    setData(prev => ({
      ...prev,
      deposits: prev.deposits.map(d => (d.id === id ? { ...d, ...deposit } : d)),
    }));
  };

  const deleteDeposit = (id: string) => {
    setData(prev => ({
      ...prev,
      deposits: prev.deposits.filter(d => d.id !== id),
    }));
  };

  // Show loading state while data is being loaded
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'var(--text-primary)',
        background: 'var(--bg-primary)'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <FinancialDataContext.Provider
      value={{
        data,
        addAsset,
        updateAsset,
        deleteAsset,
        addLiability,
        updateLiability,
        deleteLiability,
        addIncome,
        updateIncome,
        deleteIncome,
        addExpense,
        updateExpense,
        deleteExpense,
        addAssetCategory,
        addLiabilityCategory,
        addExpenseCategory,
        addStockHolding,
        updateStockHolding,
        deleteStockHolding,
        updateStockPrice,
        updateStockPrices,
        addCryptoHolding,
        updateCryptoHolding,
        deleteCryptoHolding,
        updateCryptoPrice,
        updateCryptoPrices,
        addTradingAccount,
        updateTradingAccount,
        deleteTradingAccount,
        addCryptoAccount,
        updateCryptoAccount,
        deleteCryptoAccount,
        addDeposit,
        updateDeposit,
        deleteDeposit,
      }}
    >
      {children}
    </FinancialDataContext.Provider>
  );
};

export const useFinancialData = (): FinancialDataContextType => {
  const context = useContext(FinancialDataContext);
  if (!context) {
    throw new Error('useFinancialData must be used within FinancialDataProvider');
  }
  return context;
};


