import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Asset, Liability, Income, Expense, FinancialData, StockHolding, CryptoHolding, TradingAccount, CryptoAccount, Deposit } from '../types/financial';
import { loadFinancialData, saveFinancialData } from '../services/storageService';

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
  // Crypto tracking
  addCryptoHolding: (holding: Omit<CryptoHolding, 'id'>) => void;
  updateCryptoHolding: (id: string, holding: Partial<CryptoHolding>) => void;
  deleteCryptoHolding: (id: string) => void;
  updateCryptoPrice: (id: string, price: number) => void;
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

export const FinancialDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<FinancialData>({
    assets: [],
    liabilities: [],
    income: [],
    expenses: [],
    assetCategories: ['Cash', 'Savings Account', 'Checking Account', 'Investment', 'Retirement Account', 'Real Estate', 'Vehicle', 'Other'],
    liabilityCategories: ['Credit Card', 'Personal Loan', 'Mortgage', 'Auto Loan', 'Student Loan', 'Medical Debt', 'Other'],
    stockHoldings: [],
    cryptoHoldings: [],
    tradingAccounts: [],
    cryptoAccounts: [],
    deposits: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedData = await loadFinancialData();
        setData(loadedData);
      } catch (error) {
        console.error('Error loading financial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Save data when it changes
  useEffect(() => {
    if (!isLoading) {
      saveFinancialData(data);
    }
  }, [data, isLoading]);

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
        color: 'var(--text-primary)'
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
        addCryptoHolding,
        updateCryptoHolding,
        deleteCryptoHolding,
        updateCryptoPrice,
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

