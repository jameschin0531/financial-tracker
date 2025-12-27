// Free crypto price API using CoinGecko (no API key needed for basic usage)
// Rate limit: 10-50 calls/minute depending on plan

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// Cache for crypto prices
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();
const CACHE_DURATION = 300000; // 5 minutes cache

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
  };
}

export const getCryptoPrice = async (symbol: string): Promise<number | null> => {
  const cacheKey = symbol.toUpperCase();
  const now = Date.now();
  
  // Check cache first
  const cached = priceCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.price;
  }
  
  try {
    // CoinGecko uses coin IDs, not symbols
    // Common mappings
    const coinIdMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'ADA': 'cardano',
      'XRP': 'ripple',
      'DOT': 'polkadot',
      'DOGE': 'dogecoin',
      'MATIC': 'matic-network',
      'AVAX': 'avalanche-2',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'ATOM': 'cosmos',
      'LTC': 'litecoin',
      'ETC': 'ethereum-classic',
      'XLM': 'stellar',
      'ALGO': 'algorand',
      'VET': 'vechain',
      'FIL': 'filecoin',
      'TRX': 'tron',
      'EOS': 'eos',
      'AAVE': 'aave',
      'MKR': 'maker',
      'COMP': 'compound-governance-token',
      'SUSHI': 'sushi',
      'SNX': 'havven',
      'YFI': 'yearn-finance',
      'CRV': 'curve-dao-token',
      'USDT': 'tether',
      'WLD': 'worldcoin-wld',
      // Alternative IDs if the above don't work
      'USDC': 'usd-coin',
      'DAI': 'dai',
    };
    
    // Try primary coin ID
    let coinId = coinIdMap[cacheKey] || cacheKey.toLowerCase();
    const alternativeIds: Record<string, string[]> = {
      'WLD': ['worldcoin-wld', 'worldcoin'],
      'USDT': ['tether', 'tether-usd'],
    };
    
    const idsToTry = coinIdMap[cacheKey] 
      ? [coinIdMap[cacheKey], ...(alternativeIds[cacheKey] || [])]
      : [cacheKey.toLowerCase(), ...(alternativeIds[cacheKey] || [])];
    
    for (const tryId of idsToTry) {
      const url = `${COINGECKO_API}?ids=${tryId}&vs_currencies=usd`;
      
      const response = await fetch(url);
      if (!response.ok) {
        continue; // Try next ID
      }
      
      const data = await response.json() as CoinGeckoResponse;
      
      if (data[tryId] && data[tryId].usd) {
        const price = data[tryId].usd;
        if (price > 0) {
          priceCache.set(cacheKey, { price, timestamp: now });
          return price;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    return null;
  }
};

// Batch fetch multiple crypto prices
export const getCryptoPrices = async (symbols: string[]): Promise<Map<string, number>> => {
  const prices = new Map<string, number>();
  const now = Date.now();
  
  // Coin ID mapping (same as in getCryptoPrice)
  const coinIdMap: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'ADA': 'cardano',
    'XRP': 'ripple',
    'DOT': 'polkadot',
    'DOGE': 'dogecoin',
    'MATIC': 'matic-network',
    'AVAX': 'avalanche-2',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'ATOM': 'cosmos',
    'LTC': 'litecoin',
    'ETC': 'ethereum-classic',
    'XLM': 'stellar',
    'ALGO': 'algorand',
    'VET': 'vechain',
    'FIL': 'filecoin',
    'TRX': 'tron',
    'EOS': 'eos',
    'AAVE': 'aave',
    'MKR': 'maker',
    'COMP': 'compound-governance-token',
    'SUSHI': 'sushi',
    'SNX': 'havven',
    'YFI': 'yearn-finance',
    'CRV': 'curve-dao-token',
    'USDT': 'tether',
    'WLD': 'worldcoin-wld',
    'USDC': 'usd-coin',
    'DAI': 'dai',
  };
  
  // Check cache first
  const symbolsToFetch: string[] = [];
  for (const symbol of symbols) {
    const cacheKey = symbol.toUpperCase();
    const cached = priceCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      prices.set(cacheKey, cached.price);
    } else {
      symbolsToFetch.push(symbol);
    }
  }
  
  if (symbolsToFetch.length === 0) {
    return prices;
  }
  
  // Batch fetch using CoinGecko's batch API
  try {
    const coinIds = symbolsToFetch.map(s => {
      const upperSymbol = s.toUpperCase();
      return coinIdMap[upperSymbol] || upperSymbol.toLowerCase();
    });
    
    const url = `${COINGECKO_API}?ids=${coinIds.join(',')}&vs_currencies=usd`;
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json() as CoinGeckoResponse;
      
      for (const symbol of symbolsToFetch) {
        const upperSymbol = symbol.toUpperCase();
        const coinId = coinIdMap[upperSymbol] || upperSymbol.toLowerCase();
        
        if (data[coinId] && data[coinId].usd) {
          const price = data[coinId].usd;
          if (price > 0) {
            prices.set(upperSymbol, price);
            priceCache.set(upperSymbol, { price, timestamp: now });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching batch crypto prices:', error);
    // Fallback to individual fetches
    for (const symbol of symbolsToFetch) {
      const price = await getCryptoPrice(symbol);
      if (price !== null) {
        prices.set(symbol.toUpperCase(), price);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return prices;
};

