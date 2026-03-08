import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DASHBOARD_SOURCE = readFileSync(
  new URL("../../src/components/Dashboard/Dashboard.tsx", import.meta.url),
  "utf8",
);

describe("Dashboard financial summary card order", () => {
  test("shows Net Worth as the first item", () => {
    const financialSummaryMatch = DASHBOARD_SOURCE.match(
      /financialSummary:\s*\([\s\S]*?<div className=\{styles\.sectionGrid\}>([\s\S]*?)<\/div>\s*<\/div>\s*\),/,
    );

    expect(financialSummaryMatch).toBeTruthy();

    const financialSummaryContent = financialSummaryMatch?.[1] ?? "";
    const titles = Array.from(financialSummaryContent.matchAll(/title="([^"]+)"/g)).map(
      (match) => match[1],
    );

    expect(titles).toEqual(["Net Worth", "Total Assets", "Total Liabilities"]);
  });
});
