import { describe, expect, test } from "bun:test";
import { getStockPrices } from "../../src/services/stockPriceService";

describe("stockPriceService", () => {
  test("calls local /api/stock-prices once for batched symbols", async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      requestedUrls.push(url);

      return new Response(
        JSON.stringify({
          prices: { AAPL: 190.1, TSLA: 244.2 },
          sourceBySymbol: { AAPL: "yahoo", TSLA: "twelvedata" },
          missing: [],
          durationMs: 120,
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const prices = await getStockPrices(["aapl", "TSLA", "AAPL"]);
      expect(requestedUrls.length).toBe(1);
      expect(requestedUrls[0]).toBe("/api/stock-prices?symbols=AAPL%2CTSLA");
      expect(prices.get("AAPL")).toBe(190.1);
      expect(prices.get("TSLA")).toBe(244.2);
      expect(prices.size).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("handles missing symbols and partial prices safely", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          prices: { TSLA: 250.55 },
          sourceBySymbol: { TSLA: "yahoo" },
          missing: ["AAPL"],
          durationMs: 98,
        }),
        { status: 200 },
      )) as typeof fetch;

    try {
      const prices = await getStockPrices(["AAPL", "TSLA"]);
      expect(prices.get("TSLA")).toBe(250.55);
      expect(prices.has("AAPL")).toBe(false);
      expect(prices.size).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
