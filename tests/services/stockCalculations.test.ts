import { describe, expect, test } from "bun:test";
import type { StockHolding } from "../../src/types/financial";
import { excludeCashHoldings } from "../../src/services/stockCalculations";

describe("excludeCashHoldings", () => {
  test("removes broker cash holdings from stock holdings", () => {
    const holdings: StockHolding[] = [
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
      {
        id: "s3",
        code: "VOO",
        quantity: 1,
        avgPrice: 300,
        marketPrice: 330,
        account: "Tiger",
        stockType: "ETF",
        currency: "USD",
        exchangeRate: 5,
      },
    ];

    expect(excludeCashHoldings(holdings).map((holding) => holding.code)).toEqual(["AAPL", "VOO"]);
  });
});
