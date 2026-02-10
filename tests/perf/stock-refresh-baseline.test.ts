import { describe, expect, test } from "bun:test";
import { getStockPrices } from "../../src/services/stockPriceService";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe("stock refresh performance", () => {
  test("20 symbols should refresh within 2 seconds target using batched local endpoint", async () => {
    const originalFetch = globalThis.fetch;
    const symbols = Array.from({ length: 20 }, (_, index) => `SYM${index + 1}`);
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      requestedUrls.push(url);

      await delay(300);
      return new Response(
        JSON.stringify({
          prices: Object.fromEntries(symbols.map(symbol => [symbol, 123.45])),
          sourceBySymbol: Object.fromEntries(symbols.map(symbol => [symbol, "yahoo"])),
          missing: [],
          durationMs: 300,
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const startedAt = performance.now();
      const prices = await getStockPrices(symbols);
      const durationMs = performance.now() - startedAt;

      expect(requestedUrls.length).toBe(1);
      expect(prices.size).toBe(20);
      expect(durationMs).toBeLessThanOrEqual(2000);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
