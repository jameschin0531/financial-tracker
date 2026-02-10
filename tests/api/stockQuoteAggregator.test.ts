import { describe, expect, test } from "bun:test";
import { aggregateStockQuotes } from "../../api/stockQuoteAggregator";
import { StockQuoteCache } from "../../api/stockQuoteCache";

describe("stock quote aggregator", () => {
  test("merges quotes from providers, deduplicates symbols, and tracks source", async () => {
    const providerCalls: Array<{ source: string; symbols: string[] }> = [];

    const result = await aggregateStockQuotes(["aapl", "TSLA", "AAPL"], {
      cache: new StockQuoteCache(60_000),
      providers: [
        {
          source: "yahoo",
          fetchQuotes: async symbols => {
            providerCalls.push({ source: "yahoo", symbols });
            return { AAPL: 190.11 };
          },
        },
        {
          source: "twelvedata",
          fetchQuotes: async symbols => {
            providerCalls.push({ source: "twelvedata", symbols });
            return { TSLA: 252.44 };
          },
        },
      ],
    });

    expect(providerCalls[0]?.symbols).toEqual(["AAPL", "TSLA"]);
    expect(providerCalls[1]?.symbols).toEqual(["TSLA"]);
    expect(result.prices).toEqual({ AAPL: 190.11, TSLA: 252.44 });
    expect(result.sourceBySymbol).toEqual({ AAPL: "yahoo", TSLA: "twelvedata" });
    expect(result.missing).toEqual([]);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("returns partial results and does not throw when a provider fails", async () => {
    const result = await aggregateStockQuotes(["AAPL", "TSLA"], {
      cache: new StockQuoteCache(60_000),
      providers: [
        {
          source: "yahoo",
          fetchQuotes: async () => {
            throw new Error("yahoo unavailable");
          },
        },
        {
          source: "twelvedata",
          fetchQuotes: async symbols => {
            expect(symbols).toEqual(["AAPL", "TSLA"]);
            return { TSLA: 244.99 };
          },
        },
      ],
    });

    expect(result.prices).toEqual({ TSLA: 244.99 });
    expect(result.sourceBySymbol).toEqual({ TSLA: "twelvedata" });
    expect(result.missing).toEqual(["AAPL"]);
  });
});
