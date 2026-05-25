import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
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
  const dataRef = useRef<FinancialData>(getDefaultData());
  const userIdRef = useRef<string | null>(null);
  const inFlightCountRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const localDirtyRef = useRef(false);
  const initialRefreshRef = useRef<{ userId: string | null; inFlight: boolean }>({ userId: null, inFlight: false });
  const activeUserIdRef = useRef<string | null>(null);
  const loadingDataRef = useRef(false);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  // Keep dataRef synchronized so mutation helpers always see the latest snapshot,
  // even when called in the same tick before React re-renders.
  const applyData = useCallback((next: FinancialData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const persist = useCallback(async (next: FinancialData) => {
    applyData(next);

    const userId = userIdRef.current;
    if (!userId) {
      return;
    }

    saveCachedFinancialData(userId, next);

    localDirtyRef.current = true;
    inFlightCountRef.current += 1;
    saveInFlightRef.current = true;

    try {
      await saveFinancialData(userId, next);
      if (inFlightCountRef.current === 1) {
        localDirtyRef.current = false;
      }
    } catch (error) {
      console.error('Error saving financial data:', error);
      toast.error('Failed to save changes. Please try again.');
    } finally {
      inFlightCountRef.current -= 1;
      if (inFlightCountRef.current === 0) {
        saveInFlightRef.current = false;
      }
    }
  }, [applyData]);

  const refreshDataFromServer = useCallback(async (userId: string, blockUi: boolean) => {
    if (shouldSkipBackgroundRefresh({
      blockUi,
      hasPendingSaveTimeout: false,
      isSaveInFlight: saveInFlightRef.current,
      isLocalDirty: localDirtyRef.current,
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

      applyData(loadedData);
      saveCachedFinancialData(userId, loadedData);
    } catch (error) {
      console.error('Error refreshing financial data from server:', error);
    } finally {
      if (blockUi && activeUserIdRef.current === userId) {
        setIsLoading(false);
      }
      loadingDataRef.current = false;
    }
  }, [applyData]);

  // Load data when user logs in
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        activeUserIdRef.current = null;
        // User logged out, reset to defaults
        applyData(getDefaultData());
        setIsLoading(false);
        return;
      }

      activeUserIdRef.current = user.id;

      const cachedData = loadCachedFinancialData(user.id);

      if (cachedData) {
        applyData(cachedData);
        setIsLoading(false);
        void refreshDataFromServer(user.id, false);
        return;
      }

      try {
        await refreshDataFromServer(user.id, true);
      } catch (error) {
        console.error('Error loading initial financial data:', error);
        applyData(getDefaultData());
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, refreshDataFromServer, applyData]);

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

      const current = dataRef.current;
      const next: FinancialData = {
        ...current,
        stockHoldings: current.stockHoldings.map(holding => {
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
        cryptoHoldings: current.cryptoHoldings.map(holding => {
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
      };

      void persist(next);
    };

    refreshMarketData()
      .catch(error => {
        console.error('Error refreshing market data on init:', error);
      })
      .finally(() => {
        initialRefreshRef.current.userId = user.id;
        initialRefreshRef.current.inFlight = false;
      });
  }, [data.cryptoHoldings, data.stockHoldings, isLoading, user, persist]);

  const addAsset = (asset: Omit<Asset, 'id'>) => {
    void persist({
      ...dataRef.current,
      assets: [...dataRef.current.assets, { ...asset, id: generateId() }],
    });
  };

  const updateAsset = (id: string, asset: Partial<Asset>) => {
    void persist({
      ...dataRef.current,
      assets: dataRef.current.assets.map(a => (a.id === id ? { ...a, ...asset } : a)),
    });
  };

  const deleteAsset = (id: string) => {
    void persist({
      ...dataRef.current,
      assets: dataRef.current.assets.filter(a => a.id !== id),
    });
  };

  const addLiability = (liability: Omit<Liability, 'id'>) => {
    void persist({
      ...dataRef.current,
      liabilities: [...dataRef.current.liabilities, { ...liability, id: generateId() }],
    });
  };

  const updateLiability = (id: string, liability: Partial<Liability>) => {
    void persist({
      ...dataRef.current,
      liabilities: dataRef.current.liabilities.map(l => (l.id === id ? { ...l, ...liability } : l)),
    });
  };

  const deleteLiability = (id: string) => {
    void persist({
      ...dataRef.current,
      liabilities: dataRef.current.liabilities.filter(l => l.id !== id),
    });
  };

  const addIncome = (income: Omit<Income, 'id'>) => {
    void persist({
      ...dataRef.current,
      income: [...dataRef.current.income, { ...income, id: generateId() }],
    });
  };

  const updateIncome = (id: string, income: Partial<Income>) => {
    void persist({
      ...dataRef.current,
      income: dataRef.current.income.map(i => (i.id === id ? { ...i, ...income } : i)),
    });
  };

  const deleteIncome = (id: string) => {
    void persist({
      ...dataRef.current,
      income: dataRef.current.income.filter(i => i.id !== id),
    });
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    void persist({
      ...dataRef.current,
      expenses: [...dataRef.current.expenses, { ...expense, id: generateId() }],
    });
  };

  const updateExpense = (id: string, expense: Partial<Expense>) => {
    void persist({
      ...dataRef.current,
      expenses: dataRef.current.expenses.map(e => (e.id === id ? { ...e, ...expense } : e)),
    });
  };

  const deleteExpense = (id: string) => {
    void persist({
      ...dataRef.current,
      expenses: dataRef.current.expenses.filter(e => e.id !== id),
    });
  };

  const addAssetCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    if (dataRef.current.assetCategories.includes(trimmed)) return;
    void persist({
      ...dataRef.current,
      assetCategories: [...dataRef.current.assetCategories, trimmed],
    });
  };

  const addLiabilityCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    if (dataRef.current.liabilityCategories.includes(trimmed)) return;
    void persist({
      ...dataRef.current,
      liabilityCategories: [...dataRef.current.liabilityCategories, trimmed],
    });
  };

  const addExpenseCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    if (dataRef.current.expenseCategories.includes(trimmed)) return;
    void persist({
      ...dataRef.current,
      expenseCategories: [...dataRef.current.expenseCategories, trimmed],
    });
  };

  // Stock Holdings
  const addStockHolding = (holding: Omit<StockHolding, 'id'>) => {
    void persist({
      ...dataRef.current,
      stockHoldings: [...dataRef.current.stockHoldings, { ...holding, id: generateId() }],
    });
  };

  const updateStockHolding = (id: string, holding: Partial<StockHolding>) => {
    void persist({
      ...dataRef.current,
      stockHoldings: dataRef.current.stockHoldings.map(h => (h.id === id ? { ...h, ...holding } : h)),
    });
  };

  const deleteStockHolding = (id: string) => {
    void persist({
      ...dataRef.current,
      stockHoldings: dataRef.current.stockHoldings.filter(h => h.id !== id),
    });
  };

  const updateStockPrice = (id: string, price: number) => {
    void persist({
      ...dataRef.current,
      stockHoldings: dataRef.current.stockHoldings.map(h =>
        h.id === id ? { ...h, marketPrice: price, lastUpdated: new Date().toISOString() } : h
      ),
    });
  };

  const updateStockPrices = (prices: Map<string, number>) => {
    if (prices.size === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    void persist({
      ...dataRef.current,
      stockHoldings: dataRef.current.stockHoldings.map(h => {
        if (h.stockType === 'Cash') {
          return h;
        }
        const price = prices.get(h.code.toUpperCase());
        return price === undefined
          ? h
          : { ...h, marketPrice: price, lastUpdated: timestamp };
      }),
    });
  };

  // Crypto Holdings
  const addCryptoHolding = (holding: Omit<CryptoHolding, 'id'>) => {
    void persist({
      ...dataRef.current,
      cryptoHoldings: [...dataRef.current.cryptoHoldings, { ...holding, id: generateId() }],
    });
  };

  const updateCryptoHolding = (id: string, holding: Partial<CryptoHolding>) => {
    void persist({
      ...dataRef.current,
      cryptoHoldings: dataRef.current.cryptoHoldings.map(h => (h.id === id ? { ...h, ...holding } : h)),
    });
  };

  const deleteCryptoHolding = (id: string) => {
    void persist({
      ...dataRef.current,
      cryptoHoldings: dataRef.current.cryptoHoldings.filter(h => h.id !== id),
    });
  };

  const updateCryptoPrice = (id: string, price: number) => {
    void persist({
      ...dataRef.current,
      cryptoHoldings: dataRef.current.cryptoHoldings.map(h =>
        h.id === id ? { ...h, marketPrice: price, lastUpdated: new Date().toISOString() } : h
      ),
    });
  };

  const updateCryptoPrices = (prices: Map<string, number>) => {
    if (prices.size === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    void persist({
      ...dataRef.current,
      cryptoHoldings: dataRef.current.cryptoHoldings.map(h => {
        const price = prices.get(h.symbol.toUpperCase());
        return price === undefined
          ? h
          : { ...h, marketPrice: price, lastUpdated: timestamp };
      }),
    });
  };

  // Trading Accounts
  const addTradingAccount = (account: Omit<TradingAccount, 'id'>) => {
    void persist({
      ...dataRef.current,
      tradingAccounts: [...dataRef.current.tradingAccounts, { ...account, id: generateId() }],
    });
  };

  const updateTradingAccount = (id: string, account: Partial<TradingAccount>) => {
    void persist({
      ...dataRef.current,
      tradingAccounts: dataRef.current.tradingAccounts.map(a => (a.id === id ? { ...a, ...account } : a)),
    });
  };

  const deleteTradingAccount = (id: string) => {
    void persist({
      ...dataRef.current,
      tradingAccounts: dataRef.current.tradingAccounts.filter(a => a.id !== id),
    });
  };

  // Crypto Accounts
  const addCryptoAccount = (account: Omit<CryptoAccount, 'id'>) => {
    void persist({
      ...dataRef.current,
      cryptoAccounts: [...dataRef.current.cryptoAccounts, { ...account, id: generateId() }],
    });
  };

  const updateCryptoAccount = (id: string, account: Partial<CryptoAccount>) => {
    void persist({
      ...dataRef.current,
      cryptoAccounts: dataRef.current.cryptoAccounts.map(a => (a.id === id ? { ...a, ...account } : a)),
    });
  };

  const deleteCryptoAccount = (id: string) => {
    void persist({
      ...dataRef.current,
      cryptoAccounts: dataRef.current.cryptoAccounts.filter(a => a.id !== id),
    });
  };

  // Deposits
  const addDeposit = (deposit: Omit<Deposit, 'id'>) => {
    void persist({
      ...dataRef.current,
      deposits: [...dataRef.current.deposits, { ...deposit, id: generateId() }],
    });
  };

  const updateDeposit = (id: string, deposit: Partial<Deposit>) => {
    void persist({
      ...dataRef.current,
      deposits: dataRef.current.deposits.map(d => (d.id === id ? { ...d, ...deposit } : d)),
    });
  };

  const deleteDeposit = (id: string) => {
    void persist({
      ...dataRef.current,
      deposits: dataRef.current.deposits.filter(d => d.id !== id),
    });
  };

  // Show skeleton loading state while data is being loaded
  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        </div>
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


