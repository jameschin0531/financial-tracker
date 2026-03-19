import type { Asset, Liability, Income, Expense, FinancialData, StockHolding, CryptoHolding, Currency } from '../types/financial';
import { calculateTotalPortfolioValue, excludeCashHoldings } from './stockCalculations';
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

export const calculateCashPosition = (assets: Asset[], stockHoldings: StockHolding[] = []): number => {
  const assetCash = assets
    .filter(asset => asset.assetType === 'current' && asset.category.trim().toLowerCase() === 'cash')
    .reduce((sum, asset) => {
      return sum + convertToMYR(asset.value, asset.currency, asset.exchangeRate);
    }, 0);

  const brokerCash = stockHoldings
    .filter((holding) => holding.stockType === 'Cash')
    .reduce((sum, holding) => {
      const cashValue = holding.marketPrice ?? holding.avgPrice;
      return sum + convertToMYR(cashValue, holding.currency, holding.exchangeRate);
    }, 0);

  return assetCash + brokerCash;
};

export const calculateTotalCurrentAssets = async (
  assets: Asset[],
  stockHoldings: StockHolding[] = [],
  cryptoHoldings: CryptoHolding[] = [],
): Promise<number> => {
  const currentAssetTotal = calculateCurrentAssets(assets);

  let stockTotal = 0;
  if (stockHoldings.length > 0) {
    const stockValue = await calculateTotalPortfolioValue(stockHoldings);
    stockTotal = stockValue.myr;
  }

  let cryptoTotal = 0;
  if (cryptoHoldings.length > 0) {
    const cryptoValue = await calculateTotalCryptoPortfolioValue(cryptoHoldings);
    cryptoTotal = cryptoValue.myr;
  }

  return currentAssetTotal + stockTotal + cryptoTotal;
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
  // In this app, expenses are treated as the monthly expense list (not a ledger filtered by date),
  // so we sum all items and convert to MYR.
  return expenses.reduce((sum, expense) => {
    return sum + convertToMYR(expense.amount, expense.currency, expense.exchangeRate);
  }, 0);
};

export const calculateCashFlow = (income: Income[], expenses: Expense[]): number => {
  return calculateMonthlyIncome(income) - calculateMonthlyExpenses(expenses);
};

const toISODate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Monday-based start of week (local time) for consistent weekly grouping.
export const startOfWeekISO = (isoDate: string): string => {
  const d = new Date(isoDate);
  // If parsing fails, fall back to today to avoid breaking charts
  if (Number.isNaN(d.getTime())) {
    return toISODate(new Date());
  }
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return toISODate(d);
};

const parseISODate = (isoDate: string): Date => {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    return new Date();
  }
  return d;
};

const addDays = (isoDate: string, days: number): string => {
  const d = parseISODate(isoDate);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

export interface NetWorthPoint {
  date: string;
  netWorth: number;
}

export interface NetWorthDailySnapshot {
  date: string;
  netWorth: number;
}

export interface NetWorthWeeklySnapshot {
  weekStart: string;
  netWorth: number;
}

export const buildWeeklyNetWorthSeries = (
  weeklySnapshots: NetWorthWeeklySnapshot[],
  dailySnapshots: NetWorthDailySnapshot[],
): NetWorthPoint[] => {
  const weeklyByWeek = new Map<string, number>();
  const latestDailyByWeek = new Map<string, NetWorthDailySnapshot>();
  const weekKeys = new Set<string>();

  weeklySnapshots.forEach((snapshot) => {
    const weekStart = startOfWeekISO(snapshot.weekStart);
    weeklyByWeek.set(weekStart, snapshot.netWorth);
    weekKeys.add(weekStart);
  });

  dailySnapshots.forEach((snapshot) => {
    const weekStart = startOfWeekISO(snapshot.date);
    const existing = latestDailyByWeek.get(weekStart);

    if (!existing || snapshot.date > existing.date) {
      latestDailyByWeek.set(weekStart, snapshot);
    }

    weekKeys.add(weekStart);
  });

  if (weekKeys.size === 0) {
    return [];
  }

  const sortedWeeks = Array.from(weekKeys).sort((a, b) => a.localeCompare(b));
  const firstWeek = sortedWeeks[0];
  const lastWeek = sortedWeeks[sortedWeeks.length - 1];

  if (!firstWeek || !lastWeek) {
    return [];
  }

  const output: NetWorthPoint[] = [];
  let cursor = firstWeek;
  let carryForwardValue: number | null = null;

  while (cursor <= lastWeek) {
    const exactWeekly = weeklyByWeek.get(cursor);
    const inWeekDaily = latestDailyByWeek.get(cursor);

    if (exactWeekly !== undefined) {
      carryForwardValue = exactWeekly;
      output.push({ date: cursor, netWorth: exactWeekly });
    } else if (inWeekDaily) {
      carryForwardValue = inWeekDaily.netWorth;
      output.push({ date: cursor, netWorth: inWeekDaily.netWorth });
    } else if (carryForwardValue !== null) {
      output.push({ date: cursor, netWorth: carryForwardValue });
    }

    cursor = addDays(cursor, 7);
  }

  return output;
};

export const getWeeklyNetWorthHistory = async (
  data: FinancialData
): Promise<Array<{ date: string; netWorth: number }>> => {
  const daily = await getNetWorthHistory(data);
  return buildWeeklyNetWorthSeries([], daily.map((point) => ({ date: point.date, netWorth: point.netWorth })));
};

export const getNetWorthHistory = async (data: FinancialData): Promise<Array<{ date: string; netWorth: number }>> => {
  const allDates = new Set<string>();
  
  data.assets.forEach(asset => allDates.add(asset.date));
  data.liabilities.forEach(liability => allDates.add(liability.date));
  allDates.add(toISODate(new Date()));
  
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
  const cashPosition = calculateCashPosition(assets, stockHoldings);
  const nonCashStockHoldings = excludeCashHoldings(stockHoldings);

  if (cashPosition > 0) {
    allocation['Cash'] = cashPosition;
  }

  if (nonCashStockHoldings.length > 0) {
    const stockValue = await calculateTotalPortfolioValue(nonCashStockHoldings);
    if (stockValue.myr > 0) {
      allocation['Stock Portfolio'] = stockValue.myr;
    }
  }

  if (cryptoHoldings.length > 0) {
    const cryptoValue = await calculateTotalCryptoPortfolioValue(cryptoHoldings);
    if (cryptoValue.myr > 0) {
      allocation['Crypto Portfolio'] = cryptoValue.myr;
    }
  }

  return Object.entries(allocation)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

