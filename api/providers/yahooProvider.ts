const YAHOO_SPARK_BASE = "https://query1.finance.yahoo.com/v7/finance/spark";
const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";

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

const parseSparkPrices = (data: YahooSparkResponse): Record<string, number> => {
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

export const fetchYahooQuotes = async (symbols: string[]): Promise<Record<string, number>> => {
  if (symbols.length === 0) {
    return {};
  }

  const uniqueSymbols = Array.from(new Set(symbols.map(symbol => symbol.trim().toUpperCase()).filter(Boolean)));
  const prices: Record<string, number> = {};

  try {
    const sparkUrl = `${YAHOO_SPARK_BASE}?symbols=${encodeURIComponent(uniqueSymbols.join(","))}&range=1d&interval=1m`;
    const sparkResponse = await fetch(sparkUrl);
    if (sparkResponse.ok) {
      Object.assign(prices, parseSparkPrices((await sparkResponse.json()) as YahooSparkResponse));
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
