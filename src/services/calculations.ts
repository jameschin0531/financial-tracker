import type { Asset, Liability, Income, Expense, FinancialData, StockHolding, CryptoHolding, Currency } from '../types/financial';
import { calculateTotalPortfolioValue } from './stockCalculations';
import { calculateTotalCryptoPortfolioValue } from './cryptoCalculations';

// Convert value to MYR
const convertToMYR = (value: number, currency: Currency, exchangeRate?: number): number => {
  if (currency === 'USD' && exchangeRate) {
    return value * exchangeRate;
  }
  if (currency === 'HKD' && exchangeRate) {
    return value * exchangeRate;
  }
  return value;
};

export const calculateTotalAssets = async (
  assets: Asset[], 
  stockHoldings: StockHolding[] = [],
  cryptoHoldings: CryptoHolding[] = []
): Promise<number> => {
  const assetTotal = assets.reduce((sum, asset) => {
    return sum + convertToMYR(asset.value, asset.currency, asset.exchangeRate);
  }, 0);
  
  // Add stock portfolio value
  let stockTotal = 0;
  if (stockHoldings.length > 0) {
    const stockValue = await calculateTotalPortfolioValue(stockHoldings);
    stockTotal = stockValue.myr;
  }
  
  // Add crypto portfolio value
  let cryptoTotal = 0;
  if (cryptoHoldings.length > 0) {
    const cryptoValue = await calculateTotalCryptoPortfolioValue(cryptoHoldings);
    cryptoTotal = cryptoValue.myr;
  }
  
  return assetTotal + stockTotal + cryptoTotal;
};

// Synchronous version for backward compatibility
export const calculateTotalAssetsSync = (assets: Asset[]): number => {
  return assets.reduce((sum, asset) => {
    return sum + convertToMYR(asset.value, asset.currency, asset.exchangeRate);
  }, 0);
};

export const calculateCurrentAssets = (assets: Asset[]): number => {
  return assets
    .filter(asset => asset.assetType === 'current')
    .reduce((sum, asset) => {
      return sum + convertToMYR(asset.value, asset.currency, asset.exchangeRate);
    }, 0);
};

export const calculateFixedAssets = (assets: Asset[]): number => {
  return assets
    .filter(asset => asset.assetType === 'fixed')
    .reduce((sum, asset) => {
      return sum + convertToMYR(asset.value, asset.currency, asset.exchangeRate);
    }, 0);
};

export const calculateTotalLiabilities = (liabilities: Liability[]): number => {
  return liabilities.reduce((sum, liability) => {
    return sum + convertToMYR(liability.amount, liability.currency, liability.exchangeRate);
  }, 0);
};

export const calculateNetWorth = async (
  assets: Asset[], 
  liabilities: Liability[], 
  stockHoldings: StockHolding[] = [],
  cryptoHoldings: CryptoHolding[] = []
): Promise<number> => {
  const totalAssets = await calculateTotalAssets(assets, stockHoldings, cryptoHoldings);
  return totalAssets - calculateTotalLiabilities(liabilities);
};

// Synchronous version
export const calculateNetWorthSync = (assets: Asset[], liabilities: Liability[]): number => {
  return calculateTotalAssetsSync(assets) - calculateTotalLiabilities(liabilities);
};

export const calculateMonthlyIncome = (income: Income[]): number => {
  return income.reduce((sum, item) => {
    let monthlyAmount = 0;
    switch (item.frequency) {
      case 'weekly':
        monthlyAmount = item.amount * 4.33;
        break;
      case 'bi-weekly':
        monthlyAmount = item.amount * 2.17;
        break;
      case 'monthly':
        monthlyAmount = item.amount;
        break;
      case 'yearly':
        monthlyAmount = item.amount / 12;
        break;
      case 'one-time':
        monthlyAmount = 0;
        break;
    }
    // Convert to MYR
    const myrAmount = convertToMYR(monthlyAmount, item.currency, item.exchangeRate);
    return sum + myrAmount;
  }, 0);
};

export const calculateMonthlyExpenses = (expenses: Expense[]): number => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return expenses.reduce((sum, expense) => {
    const expenseDate = new Date(expense.date);
    if (
      expenseDate.getMonth() === currentMonth &&
      expenseDate.getFullYear() === currentYear
    ) {
      // Convert to MYR
      return sum + convertToMYR(expense.amount, expense.currency, expense.exchangeRate);
    }
    return sum;
  }, 0);
};

export const calculateCashFlow = (income: Income[], expenses: Expense[]): number => {
  return calculateMonthlyIncome(income) - calculateMonthlyExpenses(expenses);
};

export const getNetWorthHistory = async (data: FinancialData): Promise<Array<{ date: string; netWorth: number }>> => {
  const allDates = new Set<string>();
  
  data.assets.forEach(asset => allDates.add(asset.date));
  data.liabilities.forEach(liability => allDates.add(liability.date));
  
  const sortedDates = Array.from(allDates).sort();
  
  // Calculate current stock and crypto values (for all dates, use current values)
  const stockValue = await calculateTotalPortfolioValue(data.stockHoldings);
  const cryptoValue = await calculateTotalCryptoPortfolioValue(data.cryptoHoldings);
  
  return sortedDates.map(date => {
    const assetsUpToDate = data.assets.filter(a => a.date <= date);
    const liabilitiesUpToDate = data.liabilities.filter(l => l.date <= date);
    const baseNetWorth = calculateNetWorthSync(assetsUpToDate, liabilitiesUpToDate);
    // Add current stock and crypto values (assuming they existed from the start)
    return {
      date,
      netWorth: baseNetWorth + stockValue.myr + cryptoValue.myr,
    };
  });
};

export const getMonthlyCashFlowData = (data: FinancialData): Array<{ month: string; income: number; expenses: number }> => {
  const monthlyData: Record<string, { income: number; expenses: number }> = {};
  
  data.income.forEach(item => {
    const date = new Date(item.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }
    let monthlyAmount = 0;
    switch (item.frequency) {
      case 'weekly':
        monthlyAmount = item.amount * 4.33;
        break;
      case 'bi-weekly':
        monthlyAmount = item.amount * 2.17;
        break;
      case 'monthly':
        monthlyAmount = item.amount;
        break;
      case 'yearly':
        monthlyAmount = item.amount / 12;
        break;
    }
    // Convert to MYR
    const myrAmount = convertToMYR(monthlyAmount, item.currency, item.exchangeRate);
    monthlyData[monthKey].income += myrAmount;
  });
  
  data.expenses.forEach(expense => {
    const date = new Date(expense.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }
    // Convert to MYR
    const myrAmount = convertToMYR(expense.amount, expense.currency, expense.exchangeRate);
    monthlyData[monthKey].expenses += myrAmount;
  });
  
  return Object.entries(monthlyData)
    .map(([month, values]) => ({
      month,
      income: values.income,
      expenses: values.expenses,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

export const getAssetAllocation = async (
  assets: Asset[],
  stockHoldings: StockHolding[] = [],
  cryptoHoldings: CryptoHolding[] = []
): Promise<Array<{ name: string; value: number }>> => {
  const allocation: Record<string, number> = {};
  
  // Add regular assets by category
  assets.forEach(asset => {
    const myrValue = convertToMYR(asset.value, asset.currency, asset.exchangeRate);
    allocation[asset.category] = (allocation[asset.category] || 0) + myrValue;
  });
  
  // Add stock portfolio
  if (stockHoldings.length > 0) {
    const stockValue = await calculateTotalPortfolioValue(stockHoldings);
    allocation['Stock Portfolio'] = (allocation['Stock Portfolio'] || 0) + stockValue.myr;
  }
  
  // Add crypto portfolio
  if (cryptoHoldings.length > 0) {
    const cryptoValue = await calculateTotalCryptoPortfolioValue(cryptoHoldings);
    allocation['Crypto Portfolio'] = (allocation['Crypto Portfolio'] || 0) + cryptoValue.myr;
  }
  
  return Object.entries(allocation)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

export const getCurrentAssetAllocation = async (
  assets: Asset[],
  stockHoldings: StockHolding[] = [],
  cryptoHoldings: CryptoHolding[] = []
): Promise<Array<{ name: string; value: number }>> => {
  const allocation: Record<string, number> = {};
  
  // Add only current assets (exclude fixed assets)
  assets
    .filter(asset => asset.assetType === 'current')
    .forEach(asset => {
      const myrValue = convertToMYR(asset.value, asset.currency, asset.exchangeRate);
      allocation[asset.category] = (allocation[asset.category] || 0) + myrValue;
    });
  
  // Add stock portfolio (considered current/liquid)
  if (stockHoldings.length > 0) {
    const stockValue = await calculateTotalPortfolioValue(stockHoldings);
    allocation['Stock Portfolio'] = (allocation['Stock Portfolio'] || 0) + stockValue.myr;
  }
  
  // Add crypto portfolio (considered current/liquid)
  if (cryptoHoldings.length > 0) {
    const cryptoValue = await calculateTotalCryptoPortfolioValue(cryptoHoldings);
    allocation['Crypto Portfolio'] = (allocation['Crypto Portfolio'] || 0) + cryptoValue.myr;
  }
  
  return Object.entries(allocation)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

