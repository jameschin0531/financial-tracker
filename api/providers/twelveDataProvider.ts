const TWELVE_DATA_PRICE_BASE = "https://api.twelvedata.com/price";

interface TwelveDataPriceResponse {
  price?: string;
  code?: number;
  message?: string;
}

export const fetchTwelveDataQuotes = async (
  symbols: string[],
  apiKey: string = process.env.TWELVE_DATA_API_KEY ?? "",
): Promise<Record<string, number>> => {
  const normalizedKey = apiKey.trim();
  if (symbols.length === 0 || normalizedKey.length === 0) {
    return {};
  }

  const responses = await Promise.all(
    symbols.map(async symbol => {
      const url = `${TWELVE_DATA_PRICE_BASE}?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(normalizedKey)}`;
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
