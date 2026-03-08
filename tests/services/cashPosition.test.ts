import { describe, expect, test } from "bun:test";
import type { Asset } from "../../src/types/financial";
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
});
