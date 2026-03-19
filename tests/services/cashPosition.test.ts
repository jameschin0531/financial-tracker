import { describe, expect, test } from "bun:test";
import type { Asset, StockHolding } from "../../src/types/financial";
import { calculateCashPosition } from "../../src/services/calculations";

describe("calculateCashPosition", () => {
  test("sums only current assets in cash category with currency conversion", () => {
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
        name: "USD Cash",
        category: "cash",
        assetType: "current",
        value: 10,
        currency: "USD",
        exchangeRate: 5,
        date: "2026-03-09",
      },
      {
        id: "a3",
        name: "Bank",
        category: "Savings",
        assetType: "current",
        value: 500,
        currency: "MYR",
        date: "2026-03-09",
      },
      {
        id: "a4",
        name: "Property Cash Bucket",
        category: "Cash",
        assetType: "fixed",
        value: 300,
        currency: "MYR",
        date: "2026-03-09",
      },
    ];

    expect(calculateCashPosition(assets)).toBe(150);
  });

  test("adds stock tracker cash holdings on top of asset cash", () => {
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
        code: "HKD CASH",
        name: "HKD Cash",
        quantity: 1,
        avgPrice: 100,
        marketPrice: 100,
        account: "Futu",
        stockType: "Cash",
        currency: "HKD",
        exchangeRate: 0.6,
      },
      {
        id: "s3",
        code: "AAPL",
        quantity: 1,
        avgPrice: 10,
        marketPrice: 12,
        account: "Tiger",
        stockType: "Stock",
        currency: "USD",
        exchangeRate: 5,
      },
    ];

    expect(calculateCashPosition(assets, stockHoldings)).toBe(260);
  });
});
