import type { CryptoHolding, CryptoAccount } from '../types/financial';
import { getUSDToMYRRate } from './exchangeRateService';

// Calculate market value for a crypto holding
// Crypto prices are always in USD from the API
export const calculateCryptoHoldingMarketValue = (
  holding: CryptoHolding,
  currentExchangeRate?: number
): { usd: number; myr: number } => {
  const marketPrice = holding.marketPrice || 0;
  // Market price is always in USD, so base value is in USD
  const usdValue = holding.quantity * marketPrice;
  
  // Use current exchange rate or stored rate (USD to MYR)
  const exchangeRate = currentExchangeRate || holding.exchangeRate || 4.7;
  
  // Convert USD to MYR
  const myrValue = usdValue * exchangeRate;
  
  return {
    usd: usdValue,
    myr: myrValue,
  };
};

// Calculate total crypto portfolio value
export const calculateTotalCryptoPortfolioValue = async (
  holdings: CryptoHolding[]
): Promise<{ usd: number; myr: number }> => {
  const exchangeRate = await getUSDToMYRRate();
  
  const totals = holdings.reduce((acc, holding) => {
    const value = calculateCryptoHoldingMarketValue(holding, exchangeRate);
    return {
      usd: acc.usd + value.usd,
      myr: acc.myr + value.myr,
    };
  }, { usd: 0, myr: 0 });
  
  return totals;
};

// Calculate profit/loss for a crypto holding
// Both market price and average price are in USD
export const calculateCryptoHoldingPandL = (
  holding: CryptoHolding,
  currentExchangeRate?: number
): { usd: number; myr: number; percentage: number } => {
  if (!holding.marketPrice) {
    return { usd: 0, myr: 0, percentage: 0 };
  }
  
  // Both prices are in USD
  const marketValueUSD = holding.quantity * holding.marketPrice;
  const costBasisUSD = holding.quantity * holding.avgPrice;
  const pnlUSD = marketValueUSD - costBasisUSD;
  
  // Use current exchange rate or stored rate (USD to MYR)
  const exchangeRate = currentExchangeRate || holding.exchangeRate || 4.7;
  const pnlMYR = pnlUSD * exchangeRate;
  
  const percentage = costBasisUSD > 0 ? (pnlUSD / costBasisUSD) * 100 : 0;
  
  return { usd: pnlUSD, myr: pnlMYR, percentage };
};

// Calculate crypto account summary
export const calculateCryptoAccountSummary = async (
  accounts: CryptoAccount[],
  holdings: CryptoHolding[]
): Promise<Array<CryptoAccount & { pnlMYR: number; pnlPercentage: number }>> => {
  const exchangeRate = await getUSDToMYRRate();
  
  return accounts.map(account => {
    // Calculate current value from crypto holdings in this account
    const accountHoldings = holdings.filter(h => h.account === account.name);
    const currentValue = accountHoldings.reduce((sum, holding) => {
      const value = calculateCryptoHoldingMarketValue(holding, exchangeRate);
      return sum + value.myr;
    }, 0);
    
    const currentUSD = accountHoldings.reduce((sum, holding) => {
      const value = calculateCryptoHoldingMarketValue(holding, exchangeRate);
      return sum + value.usd;
    }, 0);
    
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
