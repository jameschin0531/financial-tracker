import { describe, expect, test } from "bun:test";
import { fetchYahooQuotes } from "../../api/providers/yahooProvider";

describe("yahoo provider", () => {
  test("fetches batched prices from spark endpoint", async () => {
    const originalFetch = globalThis.fetch;
    const urls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      urls.push(url);

      return new Response(
        JSON.stringify({
          spark: {
            result: [
              { symbol: "AAPL", response: [{ meta: { regularMarketPrice: 193.41 } }] },
              { symbol: "TSLA", response: [{ meta: { regularMarketPrice: 251.79 } }] },
            ],
          },
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const prices = await fetchYahooQuotes(["AAPL", "TSLA"]);
      expect(urls.length).toBe(1);
      expect(urls[0]).toContain("/v7/finance/spark?");
      expect(prices).toEqual({ AAPL: 193.41, TSLA: 251.79 });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("falls back to chart endpoint when spark call fails", async () => {
    const originalFetch = globalThis.fetch;
    const urls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      urls.push(url);

      if (url.includes("/v7/finance/spark?")) {
        return new Response(
          JSON.stringify({
            finance: {
              error: { code: "Unauthorized" },
            },
          }),
          { status: 401 },
        );
      }

      if (url.includes("/v8/finance/chart/AAPL")) {
        return new Response(
          JSON.stringify({
            chart: {
              result: [{ meta: { regularMarketPrice: 190.05 } }],
            },
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          chart: {
            result: [{ meta: { regularMarketPrice: 248.32 } }],
          },
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const prices = await fetchYahooQuotes(["AAPL", "TSLA"]);
      expect(urls.some(url => url.includes("/v7/finance/spark?"))).toBe(true);
      expect(urls.some(url => url.includes("/v8/finance/chart/AAPL"))).toBe(true);
      expect(urls.some(url => url.includes("/v8/finance/chart/TSLA"))).toBe(true);
      expect(prices).toEqual({ AAPL: 190.05, TSLA: 248.32 });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
