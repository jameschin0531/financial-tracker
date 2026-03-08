import { describe, expect, test } from "bun:test";
import { buildAllocationBreakdown } from "../../src/components/Dashboard/allocationChartUtils";

describe("buildAllocationBreakdown", () => {
  test("calculates percentages from total and keeps descending order", () => {
    const rows = buildAllocationBreakdown(
      [
        { name: "Cash", value: 600 },
        { name: "Stock Portfolio", value: 400 },
      ],
      ["#1", "#2"],
      5,
    );

    expect(rows).toEqual([
      { name: "Cash", value: 600, percentage: 60, color: "#1" },
      { name: "Stock Portfolio", value: 400, percentage: 40, color: "#2" },
    ]);
  });

  test("groups smaller categories into Others when slices exceed limit", () => {
    const rows = buildAllocationBreakdown(
      [
        { name: "Cash", value: 50 },
        { name: "Stocks", value: 20 },
        { name: "Crypto", value: 15 },
        { name: "Property", value: 10 },
        { name: "Gold", value: 5 },
      ],
      ["#1", "#2", "#3", "#4"],
      4,
    );

    expect(rows).toEqual([
      { name: "Cash", value: 50, percentage: 50, color: "#1" },
      { name: "Stocks", value: 20, percentage: 20, color: "#2" },
      { name: "Crypto", value: 15, percentage: 15, color: "#3" },
      { name: "Others", value: 15, percentage: 15, color: "#4" },
    ]);
  });
});
