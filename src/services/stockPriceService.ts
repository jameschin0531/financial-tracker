export type StockQuoteSource = "yahoo" | "twelvedata" | "alphavantage";

export interface StockPriceRefreshMeta {
  prices: Map<string, number>;
  sourceBySymbol: Map<string, StockQuoteSource>;
  missing: string[];
  durationMs: number;
}

interface StockPriceApiResponse {
  prices: Record<string, number>;
  sourceBySymbol: Record<string, StockQuoteSource>;
  missing: string[];
  durationMs: number;
}

const SYMBOL_PATTERN = /^[A-Z0-9.-]+$/;

// Kept for backwards compatibility with existing auth/config flow.
export const setAlphaVantageApiKey = (_apiKey: string): void => {
  // No-op after moving quote fetching to server-side provider chain.
};

const normalizeSymbols = (symbols: string[]): string[] => {
  const deduped = new Set<string>();
  for (const rawSymbol of symbols) {
    const symbol = rawSymbol.trim().toUpperCase();
    if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
      continue;
    }
    deduped.add(symbol);
  }

  return Array.from(deduped);
};

const normalizePrices = (prices: Record<string, number>): Map<string, number> => {
  const mappedPrices = new Map<string, number>();
  for (const [rawSymbol, rawPrice] of Object.entries(prices)) {
    const symbol = rawSymbol.toUpperCase();
    if (!SYMBOL_PATTERN.test(symbol) || !Number.isFinite(rawPrice) || rawPrice <= 0) {
      continue;
    }
    mappedPrices.set(symbol, rawPrice);
  }
  return mappedPrices;
};

const normalizeSources = (
  sourceBySymbol: Record<string, StockQuoteSource>,
): Map<string, StockQuoteSource> => {
  const mappedSources = new Map<string, StockQuoteSource>();
  for (const [rawSymbol, source] of Object.entries(sourceBySymbol)) {
    const symbol = rawSymbol.toUpperCase();
    if (!SYMBOL_PATTERN.test(symbol)) {
      continue;
    }
    mappedSources.set(symbol, source);
  }
  return mappedSources;
};

export const getStockPricesWithMeta = async (symbols: string[]): Promise<StockPriceRefreshMeta> => {
  const normalizedSymbols = normalizeSymbols(symbols);
  if (normalizedSymbols.length === 0) {
    return {
      prices: new Map<string, number>(),
      sourceBySymbol: new Map<string, StockQuoteSource>(),
      missing: [],
      durationMs: 0,
    };
  }

  const query = encodeURIComponent(normalizedSymbols.join(","));
  const response = await fetch(`/api/stock-prices?symbols=${query}`);
  if (!response.ok) {
    throw new Error(`Stock quote request failed with status ${response.status}`);
  }

  const data = (await response.json()) as Partial<StockPriceApiResponse>;
  return {
    prices: normalizePrices(data.prices ?? {}),
    sourceBySymbol: normalizeSources(data.sourceBySymbol ?? {}),
    missing: normalizeSymbols(Array.isArray(data.missing) ? data.missing : []),
    durationMs: Number.isFinite(data.durationMs) ? Number(data.durationMs) : 0,
  };
};

export const getStockPrices = async (symbols: string[]): Promise<Map<string, number>> => {
  const result = await getStockPricesWithMeta(symbols);
  return result.prices;
};

export const getStockPrice = async (symbol: string): Promise<number | null> => {
  const result = await getStockPricesWithMeta([symbol]);
  const normalizedSymbol = symbol.trim().toUpperCase();
  return result.prices.get(normalizedSymbol) ?? null;
};
