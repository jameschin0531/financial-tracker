import { describe, expect, test } from "bun:test";
import { DASHBOARD_SECTION_ORDER } from "../../src/components/Dashboard/dashboardSections";

describe("DASHBOARD_SECTION_ORDER", () => {
  test("places cash flow section right below assets", () => {
    expect(DASHBOARD_SECTION_ORDER).toEqual([
      "assets",
      "cashFlow",
      "financialSummary",
    ]);
  });
});
