import { StockHolding, CryptoHolding, TradingAccount, Deposit, Currency } from '../types/financial';
import { getUSDToMYRRate, getHKDToMYRRate, getUSDToHKDRate } from './exchangeRateService';
import { calculateCryptoHoldingMarketValue } from './cryptoCalculations';

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

// Calculate market value for a stock holding
// For HKD holdings, marketPrice is in HKD, not USD
// For USD and MYR holdings, marketPrice is in USD (from API)
export const calculateHoldingMarketValue = (holding: StockHolding, currentExchangeRate?: number, currentHKDRate?: number): { usd: number; myr: number } => {
  if (!holding.marketPrice) {
    return { usd: 0, myr: 0 };
  }
  
  // Calculate market value in USD
  let marketValueUSD = 0;
  if (holding.currency === 'HKD') {
    // Market price is in HKD, convert to USD
    const usdToHkd = currentHKDRate || 7.8;
    const marketValueHKD = holding.quantity * holding.marketPrice;
    marketValueUSD = marketValueHKD / usdToHkd;
  } else {
    // Market price is in USD (for USD and MYR holdings)
    marketValueUSD = holding.quantity * holding.marketPrice;
  }
  
  // Convert to MYR using USD to MYR rate
  const usdToMyr = currentExchangeRate || holding.exchangeRate || 4.7;
  const marketValueMYR = marketValueUSD * usdToMyr;
  
  return {
    usd: marketValueUSD,
    myr: marketValueMYR,
  };
};

// Calculate total portfolio value
export const calculateTotalPortfolioValue = async (holdings: StockHolding[]): Promise<{ usd: number; myr: number }> => {
  const usdRate = await getUSDToMYRRate();
  const usdToHkdRate = await getUSDToHKDRate();
  
  const totals = holdings.reduce((acc, holding) => {
    const value = calculateHoldingMarketValue(holding, usdRate, usdToHkdRate);
    return {
      usd: acc.usd + value.usd,
      myr: acc.myr + value.myr,
    };
  }, { usd: 0, myr: 0 });
  
  return totals;
};

// Calculate portfolio allocation by type
export const calculatePortfolioAllocation = async (holdings: StockHolding[]): Promise<Array<{ type: string; value: number; percentage: number }>> => {
  const total = await calculateTotalPortfolioValue(holdings);
  const usdRate = await getUSDToMYRRate();
  const usdToHkdRate = await getUSDToHKDRate();
  
  const byType: Record<string, number> = {};
  
  for (const holding of holdings) {
    const value = calculateHoldingMarketValue(holding, usdRate, usdToHkdRate);
    // value.myr is already correctly calculated (converted from USD or HKD as needed)
    byType[holding.stockType] = (byType[holding.stockType] || 0) + value.myr;
  }
  
  return Object.entries(byType)
    .map(([type, value]) => ({
      type,
      value,
      percentage: total.myr > 0 ? (value / total.myr) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

// Calculate account summary
export const calculateAccountSummary = async (
  accounts: TradingAccount[],
  stockHoldings: StockHolding[],
  cryptoHoldings: CryptoHolding[] = []
): Promise<Array<TradingAccount & { pnlMYR: number; pnlPercentage: number }>> => {
  const usdRate = await getUSDToMYRRate();
  const usdToHkdRate = await getUSDToHKDRate();
  
  return accounts.map(account => {
    // Calculate current value from stock holdings in this account
    const accountStockHoldings = stockHoldings.filter(h => h.account === account.name);
    const stockValue = accountStockHoldings.reduce((sum, holding) => {
      const value = calculateHoldingMarketValue(holding, usdRate, usdToHkdRate);
      return sum + value.myr;
    }, 0);
    
    const stockUSD = accountStockHoldings.reduce((sum, holding) => {
      const value = calculateHoldingMarketValue(holding, usdRate, usdToHkdRate);
      return sum + value.usd;
    }, 0);
    
    // Calculate current value from crypto holdings in this account
    const accountCryptoHoldings = cryptoHoldings.filter(h => h.account === account.name);
    const cryptoValue = accountCryptoHoldings.reduce((sum, holding) => {
      const value = calculateCryptoHoldingMarketValue(holding, usdRate);
      return sum + value.myr;
    }, 0);
    
    const cryptoUSD = accountCryptoHoldings.reduce((sum, holding) => {
      const value = calculateCryptoHoldingMarketValue(holding, usdRate);
      return sum + value.usd;
    }, 0);
    
    const currentValue = stockValue + cryptoValue;
    const currentUSD = stockUSD + cryptoUSD;
    
    const pnlMYR = currentValue - account.initialMYR;
    const pnlPercentage = account.initialMYR > 0 ? (pnlMYR / account.initialMYR) * 100 : 0;
    
    return {
      ...account,
      currentMYR: currentValue,
      currentUSD,
      pnlMYR,
      pnlPercentage,
    };
  });
};

// Calculate profit/loss for a holding
// For HKD holdings, marketPrice is in HKD, not USD
// For USD and MYR holdings, marketPrice is in USD
// avgPrice is always in holding currency
export const calculateHoldingPandL = (holding: StockHolding, currentExchangeRate?: number, currentHKDRate?: number): { usd: number; myr: number; percentage: number } => {
  if (!holding.marketPrice) {
    return { usd: 0, myr: 0, percentage: 0 };
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9d4d5f3a-7801-4344-b6c6-0f62052c4b44',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'stockCalculations.ts:145',message:'P&L calculation start',data:{code:holding.code,marketPrice:holding.marketPrice,avgPrice:holding.avgPrice,avgPriceCurrency:holding.currency,quantity:holding.quantity},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  // Calculate market value in USD
  // For HKD holdings, marketPrice is in HKD, so convert to USD
  let marketValueUSD = 0;
  if (holding.currency === 'HKD') {
    // Market price is in HKD, convert to USD
    const usdToHkd = currentHKDRate || 7.8;
    const marketValueHKD = holding.quantity * holding.marketPrice;
    marketValueUSD = marketValueHKD / usdToHkd;
  } else {
    // Market price is in USD (for USD and MYR holdings)
    marketValueUSD = holding.quantity * holding.marketPrice;
  }
  
  // Cost basis is in holding currency - convert to USD for comparison
  let costBasisUSD = holding.quantity * holding.avgPrice;
  if (holding.currency === 'HKD') {
    // Convert HKD to USD
    const usdToHkd = currentHKDRate || 7.8;
    costBasisUSD = costBasisUSD / usdToHkd;
  } else if (holding.currency === 'MYR') {
    // Convert MYR to USD
    const exchangeRate = currentExchangeRate || holding.exchangeRate || 4.7;
    costBasisUSD = costBasisUSD / exchangeRate;
  }
  // If USD, no conversion needed
  
  const pnlUSD = marketValueUSD - costBasisUSD;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9d4d5f3a-7801-4344-b6c6-0f62052c4b44',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'stockCalculations.ts:155',message:'P&L calculation values',data:{marketValueUSD,costBasisUSD,pnlUSD,currency:holding.currency},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  // Convert P&L to MYR for display
  const exchangeRate = currentExchangeRate || holding.exchangeRate || 4.7;
  const pnlMYR = pnlUSD * exchangeRate;
  
  // Calculate percentage based on cost basis in USD
  const percentage = costBasisUSD > 0 ? (pnlUSD / costBasisUSD) * 100 : 0;
  
  return { usd: pnlUSD, myr: pnlMYR, percentage };
};

// Calculate total deposits by account
export const calculateTotalDeposits = (deposits: Deposit[]): Record<string, number> => {
  return deposits.reduce((acc, deposit) => {
    acc[deposit.account] = (acc[deposit.account] || 0) + deposit.amount;
    return acc;
  }, {} as Record<string, number>);
};

