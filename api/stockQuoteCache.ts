import type { QuoteSource } from "./stockQuoteAggregator";

interface CachedQuoteEntry {
  price: number;
  source: QuoteSource;
  updatedAt: number;
}

interface CacheReadResult {
  prices: Record<string, number>;
  sourceBySymbol: Record<string, QuoteSource>;
  missing: string[];
}

export class StockQuoteCache {
  private readonly entries = new Map<string, CachedQuoteEntry>();

  constructor(
    private readonly ttlMs: number = 45_000,
    private readonly now: () => number = () => Date.now(),
  ) {}

  getBatch(symbols: string[], options: { allowStale?: boolean } = {}): CacheReadResult {
    const allowStale = options.allowStale ?? false;
    const prices: Record<string, number> = {};
    const sourceBySymbol: Record<string, QuoteSource> = {};
    const missing: string[] = [];

    const currentTime = this.now();

    for (const symbol of symbols) {
      const entry = this.entries.get(symbol);
      if (!entry) {
        missing.push(symbol);
        continue;
      }

      const isFresh = currentTime - entry.updatedAt <= this.ttlMs;
      if (!isFresh && !allowStale) {
        missing.push(symbol);
        continue;
      }

      prices[symbol] = entry.price;
      sourceBySymbol[symbol] = entry.source;
    }

    return { prices, sourceBySymbol, missing };
  }

  setBatch(prices: Record<string, number>, sourceBySymbol: Record<string, QuoteSource>): void {
    const updatedAt = this.now();
    for (const [symbol, price] of Object.entries(prices)) {
      const source = sourceBySymbol[symbol];
      if (!source || !Number.isFinite(price) || price <= 0) {
        continue;
      }
      this.entries.set(symbol, { price, source, updatedAt });
    }
  }
}

export const stockQuoteCache = new StockQuoteCache();
