const YAHOO_QUOTE_BASE = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=";

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: Array<{
      symbol?: string;
      regularMarketPrice?: number;
    }>;
  };
}

export const fetchYahooQuotes = async (symbols: string[]): Promise<Record<string, number>> => {
  if (symbols.length === 0) {
    return {};
  }

  const url = `${YAHOO_QUOTE_BASE}${encodeURIComponent(symbols.join(","))}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Yahoo request failed with status ${response.status}`);
  }

  const data = (await response.json()) as YahooQuoteResponse;
  const result: Record<string, number> = {};

  for (const quote of data.quoteResponse?.result ?? []) {
    const symbol = quote.symbol?.toUpperCase();
    const price = quote.regularMarketPrice;
    if (!symbol || typeof price !== "number" || price <= 0) {
      continue;
    }
    result[symbol] = price;
  }

  return result;
};
