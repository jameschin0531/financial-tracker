import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { StockHolding } from "../../src/types/financial";
import { groupHoldingsByCode } from "../../src/utils/stockGrouping";

const originalFetch = globalThis.fetch;

beforeAll(() => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ base: "USD", date: "2026-01-01", rates: { MYR: 4.11, HKD: 7.84 } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as unknown as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

const makeHolding = (overrides: Partial<StockHolding>): StockHolding => ({
  id: "h1",
  code: "TEST",
  quantity: 1,
  avgPrice: 1,
  marketPrice: 1,
  account: "Etoro",
  stockType: "Stock",
  currency: "USD",
  ...overrides,
});

describe("groupHoldingsByCode P&L percentage", () => {
  test("HKD holding percentage is independent of the HKD/USD rate", async () => {
    const [group] = await groupHoldingsByCode(
      [makeHolding({ code: "0700.HK", currency: "HKD", quantity: 46.22, avgPrice: 466.89, marketPrice: 344 })],
      10_000,
    );
    // (344 - 466.89) / 466.89 = -26.32%
    expect(group!.totalPandL.percentage).toBeCloseTo(-26.32, 1);
  });

  test("USD holding percentage is price change over avg price", async () => {
    const [group] = await groupHoldingsByCode(
      [makeHolding({ code: "QQQM", quantity: 30.779, avgPrice: 251, marketPrice: 263.38 })],
      10_000,
    );
    expect(group!.totalPandL.percentage).toBeCloseTo(4.93, 1);
  });
});
