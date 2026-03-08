import { describe, expect, test } from "bun:test";
import type { Expense, Income } from "../../src/types/financial";
import {
  buildCashFlowTableItems,
  shouldDeleteCashFlowItem,
} from "../../src/pages/CashFlowPage";

describe("cashFlowTableUtils", () => {
  test("includes remarks for each record in table items", () => {
    const income: Income[] = [
      {
        id: "income-1",
        source: "Salary",
        amount: 5000,
        currency: "MYR",
        frequency: "monthly",
        date: "2026-03-01",
      },
    ];
    const expenses: Expense[] = [
      {
        id: "expense-1",
        category: "Food",
        amount: 500,
        currency: "MYR",
        date: "2026-03-01",
        description: "Groceries",
      },
    ];

    const items = buildCashFlowTableItems(income, expenses);

    expect(items[0]?.remark).toBe("-");
    expect(items[1]?.remark).toBe("Groceries");
  });

  test("creates row keys unique by type and id", () => {
    const income: Income[] = [
      {
        id: "same-id",
        source: "Salary",
        amount: 5000,
        currency: "MYR",
        frequency: "monthly",
        date: "2026-03-01",
      },
    ];
    const expenses: Expense[] = [
      {
        id: "same-id",
        category: "Food",
        amount: 500,
        currency: "MYR",
        date: "2026-03-01",
      },
    ];

    const items = buildCashFlowTableItems(income, expenses);

    expect(items[0]?.rowKey).toBe("income-same-id");
    expect(items[1]?.rowKey).toBe("expense-same-id");
  });

  test("allows delete when confirm function is unavailable", () => {
    expect(shouldDeleteCashFlowItem("Salary", undefined)).toBe(true);
  });
  test("proceeds when confirm returns undefined", () => {
    const confirmLike = (() => undefined) as unknown as (message?: string) => boolean;
    expect(shouldDeleteCashFlowItem("Salary", confirmLike)).toBe(true);
  });
});

