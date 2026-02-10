import { describe, expect, test } from "bun:test";
import { aggregateStockQuotes } from "../../api/stockQuoteAggregator";
import { StockQuoteCache } from "../../api/stockQuoteCache";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe("stock quote cache", () => {
  test("TTL behavior: fresh hit and stale miss", () => {
    let now = 1_000;
    const cache = new StockQuoteCache(1_000, () => now);

    cache.setBatch({ AAPL: 190.2 }, { AAPL: "yahoo" });
    const fresh = cache.getBatch(["AAPL"]);
    expect(fresh.prices).toEqual({ AAPL: 190.2 });
    expect(fresh.missing).toEqual([]);

    now += 1_001;
    const staleMiss = cache.getBatch(["AAPL"]);
    expect(staleMiss.prices).toEqual({});
    expect(staleMiss.missing).toEqual(["AAPL"]);

    const staleHit = cache.getBatch(["AAPL"], { allowStale: true });
    expect(staleHit.prices).toEqual({ AAPL: 190.2 });
    expect(staleHit.missing).toEqual([]);
  });

  test("partial-fill merge: cache contributes available symbols and provider fills remaining", async () => {
    const cache = new StockQuoteCache(60_000);
    cache.setBatch({ AAPL: 188.8 }, { AAPL: "yahoo" });

    const providerCalls: string[][] = [];
    const result = await aggregateStockQuotes(["AAPL", "TSLA"], {
      cache,
      providers: [
        {
          source: "yahoo",
          fetchQuotes: async symbols => {
            providerCalls.push(symbols);
            return { TSLA: 242.1 };
          },
        },
      ],
    });

    expect(providerCalls).toEqual([["TSLA"]]);
    expect(result.prices).toEqual({ AAPL: 188.8, TSLA: 242.1 });
    expect(result.missing).toEqual([]);
  });

  test("timeout fallback: returns cached value and retries primary provider once", async () => {
    let now = 10_000;
    const cache = new StockQuoteCache(1_000, () => now);
    cache.setBatch({ TSLA: 250.5 }, { TSLA: "yahoo" });
    now += 5_000; // make cache stale

    let attempts = 0;
    const result = await aggregateStockQuotes(["TSLA"], {
      cache,
      providerTimeoutMs: 20,
      providers: [
        {
          source: "yahoo",
          fetchQuotes: async () => {
            attempts += 1;
            await delay(100);
            return { TSLA: 999 };
          },
        },
      ],
    });

    expect(attempts).toBe(2);
    expect(result.prices).toEqual({ TSLA: 250.5 });
    expect(result.sourceBySymbol).toEqual({ TSLA: "yahoo" });
    expect(result.missing).toEqual([]);
  });
});
