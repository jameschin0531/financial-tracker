export type Currency = 'MYR' | 'USD' | 'HKD';

export interface Asset {
  id: string;
  name: string;
  category: string;
  assetType: 'current' | 'fixed';
  value: number;
  currency: Currency;
  exchangeRate?: number; // USD to MYR rate at time of entry
  date: string;
}

export interface Liability {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: Currency;
  exchangeRate?: number; // USD to MYR rate at time of entry
  interestRate?: number;
  date: string;
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  currency: Currency;
  exchangeRate?: number; // USD to MYR rate at time of entry
  frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'yearly' | 'one-time';
  date: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  currency: Currency;
  exchangeRate?: number; // USD to MYR rate at time of entry
  date: string;
  description?: string;
}

export type StockType = 'Stock' | 'ETF' | 'Cash';

export interface StockHolding {
  id: string;
  code: string; // Ticker symbol (e.g., TSM, TSLA, AAPL)
  name?: string; // Company name
  quantity: number;
  avgPrice: number; // Average purchase price
  marketPrice?: number; // Current market price (from API)
  lastUpdated?: string; // Last time price was fetched
  account: string; // Account name (etoro, tiger, futu, webull, etc.)
  stockType: StockType;
  currency: Currency;
  exchangeRate?: number; // USD to MYR rate
}

export interface TradingAccount {
  id: string;
  name: string; // etoro, tiger, futu, webull, etc.
  initialMYR: number;
  initialUSD: number;
  currentMYR?: number; // Calculated from holdings
  currentUSD?: number; // Calculated from holdings
}

export interface CryptoAccount {
  id: string;
  name: string; // wallet name, exchange name, etc.
  initialMYR: number;
  initialUSD: number;
  currentMYR?: number; // Calculated from crypto holdings
  currentUSD?: number; // Calculated from crypto holdings
}

export interface Deposit {
  id: string;
  account: string;
  date: string;
  amount: number; // Amount in MYR
  usd?: number;
  sgd?: number;
  aud?: number;
}

export interface CryptoHolding {
  id: string;
  symbol: string; // Crypto symbol (e.g., BTC, ETH, SOL)
  name?: string; // Full name (e.g., Bitcoin, Ethereum)
  quantity: number;
  avgPrice: number; // Average purchase price in USD
  marketPrice?: number; // Current market price (from API)
  lastUpdated?: string; // Last time price was fetched
  account: string; // Account/wallet name
  currency: Currency;
  exchangeRate?: number; // USD to MYR rate
}

export interface FinancialData {
  assets: Asset[];
  liabilities: Liability[];
  income: Income[];
  expenses: Expense[];
  assetCategories: string[];
  liabilityCategories: string[];
  expenseCategories: string[];
  stockHoldings: StockHolding[];
  cryptoHoldings: CryptoHolding[];
  tradingAccounts: TradingAccount[];
  cryptoAccounts: CryptoAccount[];
  deposits: Deposit[];
}

