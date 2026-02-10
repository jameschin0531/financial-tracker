import { describe, expect, test } from "bun:test";
import { getStockPrices } from "../../src/services/stockPriceService";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe("stock refresh baseline", () => {
  test("20 symbols should refresh within 2 seconds target (expected to fail before optimization)", async () => {
    const originalFetch = globalThis.fetch;
    const symbols = Array.from({ length: 20 }, (_, index) => `SYM${index + 1}`);
    const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";
    const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";
    const YAHOO_BATCH_BASE = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=";
    const ALL_ORIGINS_BASE = "https://api.allorigins.win/raw?url=";

    const mockedFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.startsWith(YAHOO_BATCH_BASE)) {
        await delay(100);
        return new Response(JSON.stringify({ quoteResponse: { result: [] } }), { status: 200 });
      }

      if (url.startsWith(ALPHA_VANTAGE_BASE)) {
        await delay(120);
        return new Response(JSON.stringify({ Note: "API call frequency limit reached." }), { status: 200 });
      }

      if (url.startsWith(YAHOO_CHART_BASE)) {
        await delay(220);
        throw new Error("Synthetic CORS failure");
      }

      if (url.startsWith(ALL_ORIGINS_BASE)) {
        await delay(220);
        const decodedUrl = decodeURIComponent(url.slice(ALL_ORIGINS_BASE.length));
        if (decodedUrl.startsWith(YAHOO_BATCH_BASE)) {
          return new Response(JSON.stringify({ quoteResponse: { result: [] } }), { status: 200 });
        }

        return new Response(
          JSON.stringify({
            chart: {
              result: [{ meta: { regularMarketPrice: 123.45 } }],
            },
          }),
          { status: 200 },
        );
      }

      return originalFetch(input as RequestInfo, init);
    };

    globalThis.fetch = mockedFetch;

    try {
      const startedAt = performance.now();
      const prices = await getStockPrices(symbols);
      const durationMs = performance.now() - startedAt;

      expect(prices.size).toBe(20);
      expect(durationMs).toBeLessThanOrEqual(2000);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
