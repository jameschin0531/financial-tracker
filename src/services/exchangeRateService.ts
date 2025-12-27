// Free API: exchangerate-api.com (no API key required for basic usage)
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

interface ExchangeRateResponse {
  rates: {
    MYR: number;
    HKD: number;
    [key: string]: number;
  };
  base: string;
  date: string;
}

let cachedRates: { 
  usdToMyr: number; 
  hkdToMyr: number;
  usdToHkd: number;
  timestamp: number 
} | null = null;
const CACHE_DURATION = 3600000; // 1 hour cache

export const getUSDToMYRRate = async (): Promise<number> => {
  const rates = await getExchangeRates();
  return rates.usdToMyr;
};

export const getHKDToMYRRate = async (): Promise<number> => {
  const rates = await getExchangeRates();
  return rates.hkdToMyr;
};

export const getUSDToHKDRate = async (): Promise<number> => {
  const rates = await getExchangeRates();
  return rates.usdToHkd;
};

const getExchangeRates = async (): Promise<{ usdToMyr: number; hkdToMyr: number; usdToHkd: number }> => {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (cachedRates && (now - cachedRates.timestamp) < CACHE_DURATION) {
    return {
      usdToMyr: cachedRates.usdToMyr,
      hkdToMyr: cachedRates.hkdToMyr,
      usdToHkd: cachedRates.usdToHkd,
    };
  }
  
  try {
    const response = await fetch(EXCHANGE_RATE_API);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }
    
    const data: ExchangeRateResponse = await response.json();
    const usdToMyr = data.rates.MYR;
    const usdToHkd = data.rates.HKD || 7.8; // 1 USD = ~7.8 HKD
    // HKD to MYR: If 1 USD = X MYR and 1 USD = Y HKD, then 1 HKD = X/Y MYR
    const hkdToMyr = usdToHkd ? usdToMyr / usdToHkd : 0.6; // Approximate HKD to MYR
    
    if (!usdToMyr || usdToMyr <= 0) {
      throw new Error('Invalid exchange rate received');
    }
    
    // Cache the rates
    cachedRates = { 
      usdToMyr, 
      hkdToMyr: hkdToMyr || 0.6, // Fallback to approximate if not available
      usdToHkd: usdToHkd || 7.8,
      timestamp: now 
    };
    
    return {
      usdToMyr,
      hkdToMyr: hkdToMyr || 0.6,
      usdToHkd: usdToHkd || 7.8,
    };
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    // Return cached rates even if expired, or fallback to approximate rates
    if (cachedRates) {
      return {
        usdToMyr: cachedRates.usdToMyr,
        hkdToMyr: cachedRates.hkdToMyr,
        usdToHkd: cachedRates.usdToHkd,
      };
    }
    
    // Fallback to approximate rates
    return {
      usdToMyr: 4.7, // Approximate MYR per USD
      hkdToMyr: 0.6, // Approximate MYR per HKD
      usdToHkd: 7.8, // Approximate HKD per USD
    };
  }
};

