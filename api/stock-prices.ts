import type { VercelRequest, VercelResponse } from "@vercel/node";

const YAHOO_SPARK_BASE = "https://query1.finance.yahoo.com/v7/finance/spark";
const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";
const TWELVE_DATA_PRICE_BASE = "https://api.twelvedata.com/price";
const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";
const SYMBOL_PATTERN = /^[A-Z0-9.-]+$/;
const PROVIDER_TIMEOUT_MS = 1_500;

type QuoteSource = "yahoo" | "twelvedata" | "alphavantage";

interface AggregatedStockQuotes {
  prices: Record<string, number>;
  sourceBySymbol: Record<string, QuoteSource>;
  missing: string[];
  durationMs: number;
}

interface YahooSparkResponse {
  spark?: {
    result?: Array<{
      symbol?: string;
      response?: Array<{
        meta?: {
          regularMarketPrice?: number;
        };
        indicators?: {
          close?: Array<{
            close?: Array<number | null>;
          }>;
        };
      }>;
    }>;
  };
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
      };
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
}

interface TwelveDataPriceResponse {
  price?: string;
}

interface AlphaVantageResponse {
  "Global Quote"?: {
    "05. price"?: string;
  };
}

const applyCorsHeaders = (res: VercelResponse): void => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const getSymbolsParam = (queryValue: string | string[] | undefined): string | null => {
  if (typeof queryValue === "string") {
    return queryValue;
  }
  if (Array.isArray(queryValue)) {
    return queryValue.join(",");
  }
  return null;
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

const parseSymbolsParam = (symbolsParam: string | null): string[] =>
  normalizeSymbols((symbolsParam ?? "").split(","));

const withTimeout = async <T>(task: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const getLastValidPrice = (values: Array<number | null> | undefined): number | undefined => {
  if (!values) {
    return undefined;
  }
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
};

const parseYahooSparkPrices = (data: YahooSparkResponse): Record<string, number> => {
  const prices: Record<string, number> = {};
  for (const item of data.spark?.result ?? []) {
    const symbol = item.symbol?.toUpperCase();
    if (!symbol) {
      continue;
    }
    const response = item.response?.[0];
    const marketPrice = response?.meta?.regularMarketPrice;
    const closePrice = getLastValidPrice(response?.indicators?.close?.[0]?.close);
    const price = typeof marketPrice === "number" && marketPrice > 0 ? marketPrice : closePrice;
    if (typeof price === "number" && Number.isFinite(price) && price > 0) {
      prices[symbol] = price;
    }
  }
  return prices;
};

const fetchYahooChartPrice = async (symbol: string): Promise<number | null> => {
  const url = `${YAHOO_CHART_BASE}${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as YahooChartResponse;
  const chart = data.chart?.result?.[0];
  const marketPrice = chart?.meta?.regularMarketPrice;
  if (typeof marketPrice === "number" && Number.isFinite(marketPrice) && marketPrice > 0) {
    return marketPrice;
  }
  const closePrice = getLastValidPrice(chart?.indicators?.quote?.[0]?.close);
  return typeof closePrice === "number" && closePrice > 0 ? closePrice : null;
};

const fetchYahooQuotes = async (symbols: string[]): Promise<Record<string, number>> => {
  if (symbols.length === 0) {
    return {};
  }
  const uniqueSymbols = Array.from(new Set(symbols.map(symbol => symbol.trim().toUpperCase()).filter(Boolean)));
  const prices: Record<string, number> = {};

  try {
    const sparkUrl = `${YAHOO_SPARK_BASE}?symbols=${encodeURIComponent(uniqueSymbols.join(","))}&range=1d&interval=1m`;
    const sparkResponse = await fetch(sparkUrl);
    if (sparkResponse.ok) {
      Object.assign(prices, parseYahooSparkPrices((await sparkResponse.json()) as YahooSparkResponse));
    }
  } catch {
    // Ignore spark failure and continue with per-symbol chart fallback.
  }

  const missingSymbols = uniqueSymbols.filter(symbol => prices[symbol] === undefined);
  if (missingSymbols.length === 0) {
    return prices;
  }

  const fallbackResults = await Promise.all(
    missingSymbols.map(async symbol => {
      try {
        const price = await fetchYahooChartPrice(symbol);
        return { symbol, price };
      } catch {
        return { symbol, price: null };
      }
    }),
  );

  for (const item of fallbackResults) {
    if (item.price === null) {
      continue;
    }
    prices[item.symbol] = item.price;
  }

  return prices;
};

const fetchTwelveDataQuotes = async (symbols: string[]): Promise<Record<string, number>> => {
  const apiKey = (process.env.TWELVE_DATA_API_KEY ?? "").trim();
  if (symbols.length === 0 || apiKey.length === 0) {
    return {};
  }

  const responses = await Promise.all(
    symbols.map(async symbol => {
      const url = `${TWELVE_DATA_PRICE_BASE}?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as TwelveDataPriceResponse;
      const price = data.price ? Number.parseFloat(data.price) : Number.NaN;
      if (!Number.isFinite(price) || price <= 0) {
        return null;
      }
      return { symbol: symbol.toUpperCase(), price };
    }),
  );

  const prices: Record<string, number> = {};
  for (const item of responses) {
    if (!item) {
      continue;
    }
    prices[item.symbol] = item.price;
  }

  return prices;
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

const aggregateStockQuotes = async (symbols: string[]): Promise<AggregatedStockQuotes> => {
  const startedAt = Date.now();
  const normalizedSymbols = normalizeSymbols(symbols);
  const prices: Record<string, number> = {};
  const sourceBySymbol: Record<string, QuoteSource> = {};
  const missing = new Set<string>(normalizedSymbols);

  const providers: Array<{
    source: QuoteSource;
    fetchQuotes: (requestSymbols: string[]) => Promise<Record<string, number>>;
  }> = [
    { source: "yahoo", fetchQuotes: fetchYahooQuotes },
    { source: "twelvedata", fetchQuotes: fetchTwelveDataQuotes },
    { source: "alphavantage", fetchQuotes: fetchAlphaVantageQuotes },
  ];

  for (const provider of providers) {
    if (missing.size === 0) {
      break;
    }

    const requestSymbols = Array.from(missing);
    try {
      const providerPrices = await withTimeout(provider.fetchQuotes(requestSymbols), PROVIDER_TIMEOUT_MS);
      for (const [rawSymbol, rawPrice] of Object.entries(providerPrices)) {
        const symbol = rawSymbol.toUpperCase();
        if (!missing.has(symbol)) {
          continue;
        }
        if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
          continue;
        }
        prices[symbol] = rawPrice;
        sourceBySymbol[symbol] = provider.source;
        missing.delete(symbol);
      }
    } catch (error) {
      console.warn(`Quote provider failed: ${provider.source}`, error);
    }
  }

  return {
    prices,
    sourceBySymbol,
    missing: Array.from(missing),
    durationMs: Date.now() - startedAt,
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const symbols = parseSymbolsParam(getSymbolsParam(req.query.symbols));
  if (symbols.length === 0) {
    return res.status(400).json({ error: "Missing or invalid symbols query parameter" });
  }

  try {
    const payload = await aggregateStockQuotes(symbols);
    return res.status(200).json(payload);
  } catch (error) {
    console.error("Failed to aggregate stock quotes", error);
    return res.status(500).json({ error: "Failed to fetch stock prices" });
  }
}
