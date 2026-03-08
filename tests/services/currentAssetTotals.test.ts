import { describe, expect, test } from "bun:test";
import type { Asset, CryptoHolding, StockHolding } from "../../src/types/financial";
import { calculateTotalCurrentAssets } from "../../src/services/calculations";

describe("calculateTotalCurrentAssets", () => {
  test("sums current assets, stock portfolio, and crypto portfolio", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          rates: {
            MYR: 5,
            HKD: 10,
          },
          base: "USD",
          date: "2026-03-09",
        }),
        { status: 200 },
      )) as typeof fetch;

    try {
      const assets: Asset[] = [
        {
          id: "a1",
          name: "Cash",
          category: "Cash",
          assetType: "current",
          value: 1000,
          currency: "MYR",
          date: "2026-03-01",
        },
        {
          id: "a2",
          name: "House",
          category: "Property",
          assetType: "fixed",
          value: 500000,
          currency: "MYR",
          date: "2026-03-01",
        },
      ];

      const stockHoldings: StockHolding[] = [
        {
          id: "s1",
          code: "AAPL",
          quantity: 2,
          avgPrice: 100,
          marketPrice: 10,
          account: "Broker",
          stockType: "Stock",
          currency: "USD",
          exchangeRate: 5,
        },
      ];

      const cryptoHoldings: CryptoHolding[] = [
        {
          id: "c1",
          symbol: "BTC",
          quantity: 1,
          avgPrice: 100,
          marketPrice: 4,
          account: "Wallet",
          currency: "USD",
          exchangeRate: 5,
        },
      ];

      const total = await calculateTotalCurrentAssets(assets, stockHoldings, cryptoHoldings);

      expect(total).toBe(1120);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
