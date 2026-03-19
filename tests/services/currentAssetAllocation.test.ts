import { describe, expect, test } from "bun:test";
import type { Asset, CryptoHolding, StockHolding } from "../../src/types/financial";
import { getCurrentAssetAllocation } from "../../src/services/calculations";

describe("getCurrentAssetAllocation", () => {
  test("returns exactly cash, stock portfolio, and crypto portfolio slices", async () => {
    const originalFetch = globalThis.fetch;

    const assets: Asset[] = [
      {
        id: "a1",
        name: "Wallet",
        category: "Cash",
        assetType: "current",
        value: 100,
        currency: "MYR",
        date: "2026-03-09",
      },
      {
        id: "a2",
        name: "Savings",
        category: "Savings",
        assetType: "current",
        value: 500,
        currency: "MYR",
        date: "2026-03-09",
      },
    ];

    const stockHoldings: StockHolding[] = [
      {
        id: "s1",
        code: "TIGER CASH",
        name: "Tiger Cash",
        quantity: 1,
        avgPrice: 20,
        marketPrice: 20,
        account: "Tiger",
        stockType: "Cash",
        currency: "USD",
        exchangeRate: 5,
      },
      {
        id: "s2",
        code: "AAPL",
        quantity: 2,
        avgPrice: 100,
        marketPrice: 120,
        account: "Tiger",
        stockType: "Stock",
        currency: "USD",
        exchangeRate: 5,
      },
    ];

    const cryptoHoldings: CryptoHolding[] = [
      {
        id: "c1",
        symbol: "BTC",
        quantity: 0.01,
        avgPrice: 100000,
        marketPrice: 100000,
        account: "Luno",
        currency: "USD",
        exchangeRate: 5,
      },
    ];

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          rates: {
            MYR: 5,
            HKD: 8,
          },
          base: "USD",
          date: "2026-03-09",
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    try {
      expect(await getCurrentAssetAllocation(assets, stockHoldings, cryptoHoldings)).toEqual([
        { name: "Crypto Portfolio", value: 5000 },
        { name: "Stock Portfolio", value: 1200 },
        { name: "Cash", value: 200 },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
