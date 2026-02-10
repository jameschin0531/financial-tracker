import { fetchTwelveDataQuotes } from "./providers/twelveDataProvider";
import { fetchYahooQuotes } from "./providers/yahooProvider";

const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";
const SYMBOL_PATTERN = /^[A-Z0-9.-]+$/;

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

export const aggregateStockQuotes = async (
  symbols: string[],
  options: { providers?: QuoteProvider[] } = {},
): Promise<AggregatedStockQuotes> => {
  const startedAt = performance.now();
  const normalizedSymbols = normalizeSymbols(symbols);
  const providers = options.providers ?? buildDefaultProviders();

  const prices: Record<string, number> = {};
  const sourceBySymbol: Record<string, QuoteSource> = {};
  const remainingSymbols = new Set<string>(normalizedSymbols);

  for (const provider of providers) {
    if (remainingSymbols.size === 0) {
      break;
    }

    const requestSymbols = Array.from(remainingSymbols);

    try {
      const providerPrices = await provider.fetchQuotes(requestSymbols);
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
        remainingSymbols.delete(symbol);
      }
    } catch (error) {
      console.warn(`Quote provider failed: ${provider.source}`, error);
    }
  }

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
