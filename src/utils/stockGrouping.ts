import type { StockHolding } from '../types/financial';
import { calculateHoldingPandL } from '../services/stockCalculations';
import { getUSDToMYRRate, getUSDToHKDRate } from '../services/exchangeRateService';

export interface GroupedHolding {
  code: string;
  name?: string;
  holdings: StockHolding[];
  totalQuantity: number;
  totalMVUSD: number;
  totalMVMYR: number;
  totalPandL: { usd: number; myr: number; percentage: number };
  totalPortion: number;
  accounts: string[];
  stockType: 'Stock' | 'ETF' | 'Cash';
  weightedAvgMarketPrice?: number;
  weightedAvgAvgPrice?: number;
  currency: string; // Representative currency (first holding's currency)
}

export const groupHoldingsByCode = async (
  holdings: StockHolding[],
  portfolioValueMYR: number
): Promise<GroupedHolding[]> => {
  // Get exchange rates for converting market values
  const usdToMyrRate = await getUSDToMYRRate();
  const usdToHkdRate = await getUSDToHKDRate();
  const grouped = new Map<string, StockHolding[]>();
  
  // Group by stock code
  holdings.forEach(holding => {
    const code = holding.code.toUpperCase();
    if (!grouped.has(code)) {
      grouped.set(code, []);
    }
    grouped.get(code)!.push(holding);
  });
  
  // Convert to array and calculate totals
  return Array.from(grouped.entries()).map(([code, groupHoldings]) => {
    if (groupHoldings.length === 0) {
      throw new Error(`Empty group for code ${code}`);
    }
    const firstHolding = groupHoldings[0]!; // Safe because we checked length > 0
    let totalMVUSD = 0;
    let totalMVMYR = 0;
    let totalPandLUSD = 0;
    let totalPandLMYR = 0;
    let totalCostBasis = 0;
    const accounts = new Set<string>();
    
    groupHoldings.forEach(holding => {
      // For HKD holdings, marketPrice is typically in HKD (especially for HK stocks like 9988.HK)
      // For USD and MYR holdings, marketPrice is typically in USD (from API)
      // Convert to USD for consistent calculation
      let marketValueUSD = 0;
      if (holding.marketPrice) {
        if (holding.currency === 'HKD') {
          // For HKD holdings, marketPrice is in HKD
          // Convert HKD market value to USD
          const marketValueHKD = holding.quantity * holding.marketPrice;
          marketValueUSD = marketValueHKD / usdToHkdRate;
        } else {
          // For USD and MYR holdings, marketPrice is in USD (from API)
          marketValueUSD = holding.quantity * holding.marketPrice;
        }
      }
      
      // Convert to MYR using USD to MYR rate
      const myrValue = marketValueUSD * usdToMyrRate;
      
      totalMVUSD += marketValueUSD;
      totalMVMYR += myrValue;
      
      const pnl = calculateHoldingPandL(holding, usdToMyrRate, usdToHkdRate);
      totalPandLUSD += pnl.usd;
      totalPandLMYR += pnl.myr;
      totalCostBasis += holding.quantity * holding.avgPrice;
      
      accounts.add(holding.account);
    });
    
    const totalPandLPercentage = totalCostBasis > 0 
      ? (totalPandLUSD / totalCostBasis) * 100 
      : 0;
    
    const totalQuantity = groupHoldings.reduce((sum, h) => sum + h.quantity, 0);
    const totalPortion = portfolioValueMYR > 0 
      ? (totalMVMYR / portfolioValueMYR) * 100 
      : 0;
    
    // Calculate weighted average market price and average price
    // Weighted average = sum(quantity * price) / sum(quantity)
    // For HKD holdings, marketPrice is in HKD, so convert to USD for weighted average
    // For USD and MYR holdings, marketPrice is in USD
    let weightedMarketPriceSumUSD = 0;
    let weightedAvgPriceSum = 0;
    
    groupHoldings.forEach(holding => {
      if (holding.marketPrice) {
        if (holding.currency === 'HKD') {
          // Market price is in HKD, convert to USD for weighted average
          const marketPriceUSD = holding.marketPrice / usdToHkdRate;
          weightedMarketPriceSumUSD += holding.quantity * marketPriceUSD;
        } else {
          // Market price is in USD (for USD and MYR holdings)
          weightedMarketPriceSumUSD += holding.quantity * holding.marketPrice;
        }
      }
      weightedAvgPriceSum += holding.quantity * holding.avgPrice;
    });
    
    const weightedAvgMarketPrice = totalQuantity > 0 ? weightedMarketPriceSumUSD / totalQuantity : undefined;
    const weightedAvgAvgPrice = totalQuantity > 0 ? weightedAvgPriceSum / totalQuantity : undefined;
    
    // Use the first holding's currency as representative currency
    // (assuming all holdings of the same code have the same currency, which is typical)
    const currency = firstHolding.currency;
    
    return {
      code,
      name: firstHolding.name,
      holdings: groupHoldings,
      totalQuantity,
      totalMVUSD,
      totalMVMYR,
      totalPandL: {
        usd: totalPandLUSD,
        myr: totalPandLMYR,
        percentage: totalPandLPercentage,
      },
      totalPortion,
      accounts: Array.from(accounts),
      stockType: firstHolding.stockType,
      weightedAvgMarketPrice,
      weightedAvgAvgPrice,
      currency,
    };
  }); // Sorting is handled separately
};

export const filterGroupedHoldings = (
  grouped: GroupedHolding[],
  accountFilter: string,
  pandLFilter: string,
  portionMin: string,
  portionMax: string
): GroupedHolding[] => {
  return grouped.filter(group => {
    // Account filter
    if (accountFilter !== 'all' && !group.accounts.includes(accountFilter)) {
      return false;
    }
    
    // P&L filter
    if (pandLFilter === 'profit' && group.totalPandL.myr < 0) {
      return false;
    }
    if (pandLFilter === 'loss' && group.totalPandL.myr >= 0) {
      return false;
    }
    
    // Portion filter
    if (portionMin && group.totalPortion < parseFloat(portionMin)) {
      return false;
    }
    if (portionMax && group.totalPortion > parseFloat(portionMax)) {
      return false;
    }
    
    return true;
  });
};

export const sortGroupedHoldings = (
  grouped: GroupedHolding[],
  sortBy: 'pandl-desc' | 'pandl-asc' | 'portion-desc' | 'portion-asc' | 'value-desc' | 'value-asc'
): GroupedHolding[] => {
  const sorted = [...grouped];
  
  switch (sortBy) {
    case 'pandl-desc':
      return sorted.sort((a, b) => b.totalPandL.myr - a.totalPandL.myr);
    case 'pandl-asc':
      return sorted.sort((a, b) => a.totalPandL.myr - b.totalPandL.myr);
    case 'portion-desc':
      return sorted.sort((a, b) => b.totalPortion - a.totalPortion);
    case 'portion-asc':
      return sorted.sort((a, b) => a.totalPortion - b.totalPortion);
    case 'value-desc':
      return sorted.sort((a, b) => b.totalMVMYR - a.totalMVMYR);
    case 'value-asc':
      return sorted.sort((a, b) => a.totalMVMYR - b.totalMVMYR);
    default:
      return sorted;
  }
};

