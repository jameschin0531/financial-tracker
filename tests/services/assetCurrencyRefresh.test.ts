import { describe, expect, test } from "bun:test";
import type { Asset } from "../../src/types/financial";
import { buildUsdAssetRefreshUpdates } from "../../src/services/assetCurrencyRefresh";

describe("buildUsdAssetRefreshUpdates", () => {
  test("returns updates only for USD assets", () => {
    const assets: Asset[] = [
      {
        id: "a-1",
        name: "USD Wallet",
        category: "Cash",
        assetType: "current",
        value: 100,
        currency: "USD",
        exchangeRate: 4.2,
        date: "2026-03-09",
      },
      {
        id: "a-2",
        name: "MYR Wallet",
        category: "Cash",
        assetType: "current",
        value: 100,
        currency: "MYR",
        date: "2026-03-09",
      },
    ];

    const updates = buildUsdAssetRefreshUpdates(assets, 4.5);

    expect(updates).toEqual([
      {
        id: "a-1",
        asset: {
          exchangeRate: 4.5,
        },
      },
    ]);
  });

  test("returns empty list when rate is invalid", () => {
    const assets: Asset[] = [
      {
        id: "a-1",
        name: "USD Wallet",
        category: "Cash",
        assetType: "current",
        value: 100,
        currency: "USD",
        exchangeRate: 4.2,
        date: "2026-03-09",
      },
    ];

    expect(buildUsdAssetRefreshUpdates(assets, 0)).toEqual([]);
    expect(buildUsdAssetRefreshUpdates(assets, Number.NaN)).toEqual([]);
  });
});
