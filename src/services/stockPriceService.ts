// Free stock price API using Alpha Vantage (free tier: 5 calls/min, 500 calls/day)
// Alternative: Yahoo Finance via proxy (no API key needed)
// API key is loaded from environment variable via window.__API_CONFIG__

// Get API key from window config (injected by server) or fallback to empty string
const getAlphaVantageApiKey = (): string => {
  if (typeof window !== 'undefined' && window.__API_CONFIG__) {
    return window.__API_CONFIG__.ALPHA_VANTAGE_API_KEY || '';
  }
  return '';
};

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

interface AlphaVantageResponse {
  'Global Quote'?: {
    '01. symbol': string;
    '05. price': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
  'Error Message'?: string;
  'Note'?: string;
}

// Cache for stock prices
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();
const CACHE_DURATION = 300000; // 5 minutes cache

export const getStockPrice = async (symbol: string): Promise<number | null> => {
  const cacheKey = symbol.toUpperCase();
  const now = Date.now();
  
  // Check cache first
  const cached = priceCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.price;
  }
  
  try {
    // Try Alpha Vantage first
    const apiKey = getAlphaVantageApiKey();
    if (!apiKey) {
      // No API key configured, skip to Yahoo Finance fallback
      return await getStockPriceYahoo(symbol);
    }
    
    const url = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${cacheKey}&apikey=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    const data: AlphaVantageResponse = await response.json();
    
    if (data['Error Message']) {
      console.error('Alpha Vantage error:', data['Error Message']);
      // Fallback to Yahoo Finance
      return await getStockPriceYahoo(symbol);
    }
    
    if (data['Note']) {
      // Rate limit hit, use cache or fallback
      if (cached) {
        return cached.price;
      }
      return await getStockPriceYahoo(symbol);
    }
    
    if (data['Global Quote'] && data['Global Quote']['05. price']) {
      const price = parseFloat(data['Global Quote']['05. price']);
      if (price > 0) {
        priceCache.set(cacheKey, { price, timestamp: now });
        return price;
      }
    }
    
    // Fallback to Yahoo Finance
    return await getStockPriceYahoo(symbol);
  } catch (error) {
    console.error('Error fetching stock price from Alpha Vantage:', error);
    // Fallback to Yahoo Finance
    return await getStockPriceYahoo(symbol);
  }
};

// Fallback: Yahoo Finance via CORS proxy (no API key needed)
const getStockPriceYahoo = async (symbol: string): Promise<number | null> => {
  try {
    // Using a CORS proxy to access Yahoo Finance
    // Note: In production, you should use your own proxy server or API key
    const symbolUpper = symbol.toUpperCase();
    // Try direct access first (may work in some browsers)
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolUpper}?interval=1d&range=1d`;
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
          const price = data.chart.result[0].meta.regularMarketPrice;
          if (price > 0) {
            const cacheKey = symbolUpper;
            priceCache.set(cacheKey, { price, timestamp: Date.now() });
            return price;
          }
        }
      }
    } catch (corsError) {
      // CORS error, try alternative approach
      console.log('Direct access failed, trying alternative method');
    }
    
    // Alternative: Use a public CORS proxy (for development only)
    // In production, use your own backend or API key
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbolUpper}?interval=1d&range=1d`)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error('Yahoo Finance request failed');
    }
    
    const data = await response.json();
    
    if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      const price = data.chart.result[0].meta.regularMarketPrice;
      if (price > 0) {
        const cacheKey = symbolUpper;
        priceCache.set(cacheKey, { price, timestamp: Date.now() });
        return price;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching stock price from Yahoo Finance:', error);
    return null;
  }
};

// Batch fetch multiple stock prices
export const getStockPrices = async (symbols: string[]): Promise<Map<string, number>> => {
  const prices = new Map<string, number>();
  
  // Fetch prices with delay to avoid rate limits
  for (const symbol of symbols) {
    const price = await getStockPrice(symbol);
    if (price !== null) {
      prices.set(symbol.toUpperCase(), price);
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return prices;
};

