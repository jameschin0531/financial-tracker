import { fetchTwelveDataQuotes } from "./providers/twelveDataProvider";
import { fetchYahooQuotes } from "./providers/yahooProvider";
import { stockQuoteCache, type StockQuoteCache } from "./stockQuoteCache";

const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";
const SYMBOL_PATTERN = /^[A-Z0-9.-]+$/;
const DEFAULT_PROVIDER_TIMEOUT_MS = 1_500;
const PRIMARY_PROVIDER_MAX_RETRIES = 1;

interface AlphaVantageResponse {
  "Global Quote"?: {
    "05. price"?: string;
  };
}

export type QuoteSource = "yahoo" | "twelvedata" | "alphavantage";

export interface QuoteProvider {
  source: QuoteSource;
  fetchQuotes: (symbols: string[]) => Promise<Record<string, number>>;
}

export interface AggregatedStockQuotes {
  prices: Record<string, number>;
  sourceBySymbol: Record<string, QuoteSource>;
  missing: string[];
  durationMs: number;
}

class ProviderTimeoutError extends Error {
  constructor(source: QuoteSource, timeoutMs: number) {
    super(`Provider timeout: ${source} (${timeoutMs}ms)`);
    this.name = "ProviderTimeoutError";
  }
}

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

const fetchAlphaVantageQuotes = async (symbols: string[]): Promise<Record<string, number>> => {
  const apiKey = (process.env.ALPHA_VANTAGE_API_KEY ?? "").trim();
  if (!apiKey || symbols.length === 0) {
    return {};
  }

  const prices: Record<string, number> = {};

  for (const symbol of symbols) {
    try {
      const url = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as AlphaVantageResponse;
      const rawPrice = data["Global Quote"]?.["05. price"];
      const price = rawPrice ? Number.parseFloat(rawPrice) : Number.NaN;
      if (Number.isFinite(price) && price > 0) {
        prices[symbol] = price;
      }
    } catch {
      // Ignore single-symbol failures so the provider chain can continue.
    }
  }

  return prices;
};

const buildDefaultProviders = (): QuoteProvider[] => [
  {
    source: "yahoo",
    fetchQuotes: fetchYahooQuotes,
  },
  {
    source: "twelvedata",
    fetchQuotes: fetchTwelveDataQuotes,
  },
  {
    source: "alphavantage",
    fetchQuotes: fetchAlphaVantageQuotes,
  },
];

const withTimeout = async <T>(
  task: Promise<T>,
  timeoutMs: number,
  source: QuoteSource,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new ProviderTimeoutError(source, timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const fetchWithPolicy = async (
  provider: QuoteProvider,
  symbols: string[],
  providerIndex: number,
  providerTimeoutMs: number,
): Promise<Record<string, number>> => {
  const maxAttempts = providerIndex === 0 ? 1 + PRIMARY_PROVIDER_MAX_RETRIES : 1;
  let attempts = 0;
  let lastError: unknown;

  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      return await withTimeout(provider.fetchQuotes(symbols), providerTimeoutMs, provider.source);
    } catch (error) {
      lastError = error;
      if (attempts >= maxAttempts) {
        throw error;
      }
    }
  }

  throw lastError;
};

export const aggregateStockQuotes = async (
  symbols: string[],
  options: {
    cache?: StockQuoteCache;
    providerTimeoutMs?: number;
    providers?: QuoteProvider[];
  } = {},
): Promise<AggregatedStockQuotes> => {
  const startedAt = performance.now();
  const normalizedSymbols = normalizeSymbols(symbols);
  const cache = options.cache ?? stockQuoteCache;
  const providerTimeoutMs = options.providerTimeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;
  const providers = options.providers ?? buildDefaultProviders();

  const freshCache = cache.getBatch(normalizedSymbols);
  const staleCache = cache.getBatch(normalizedSymbols, { allowStale: true });

  const prices: Record<string, number> = { ...freshCache.prices };
  const sourceBySymbol: Record<string, QuoteSource> = { ...freshCache.sourceBySymbol };
  const newlyFetchedPrices: Record<string, number> = {};
  const newlyFetchedSources: Record<string, QuoteSource> = {};
  const remainingSymbols = new Set<string>(freshCache.missing);
  let timedOut = false;

  for (const [providerIndex, provider] of providers.entries()) {
    if (remainingSymbols.size === 0) {
      break;
    }

    const requestSymbols = Array.from(remainingSymbols);

    try {
      const providerPrices = await fetchWithPolicy(
        provider,
        requestSymbols,
        providerIndex,
        providerTimeoutMs,
      );

      for (const [rawSymbol, rawPrice] of Object.entries(providerPrices)) {
        const symbol = rawSymbol.toUpperCase();
        if (!remainingSymbols.has(symbol)) {
          continue;
        }
        if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
          continue;
        }

        prices[symbol] = rawPrice;
        sourceBySymbol[symbol] = provider.source;
        newlyFetchedPrices[symbol] = rawPrice;
        newlyFetchedSources[symbol] = provider.source;
        remainingSymbols.delete(symbol);
      }
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        timedOut = true;
      }
      console.warn(`Quote provider failed: ${provider.source}`, error);
    }
  }

  if (timedOut && remainingSymbols.size > 0) {
    for (const symbol of Array.from(remainingSymbols)) {
      const fallbackPrice = staleCache.prices[symbol];
      const fallbackSource = staleCache.sourceBySymbol[symbol];
      if (fallbackPrice === undefined || fallbackSource === undefined) {
        continue;
      }

      prices[symbol] = fallbackPrice;
      sourceBySymbol[symbol] = fallbackSource;
      remainingSymbols.delete(symbol);
    }
  }

  cache.setBatch(newlyFetchedPrices, newlyFetchedSources);

  return {
    prices,
    sourceBySymbol,
    missing: Array.from(remainingSymbols),
    durationMs: performance.now() - startedAt,
  };
};

export const parseSymbolsParam = (symbolsParam: string | null): string[] =>
  normalizeSymbols((symbolsParam ?? "").split(","));

export const handleStockQuoteAggregatorRequest = async (symbolsParam: string | null): Promise<Response> => {
  const symbols = parseSymbolsParam(symbolsParam);
  if (symbols.length === 0) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid symbols query parameter" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  const payload = await aggregateStockQuotes(symbols);
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
