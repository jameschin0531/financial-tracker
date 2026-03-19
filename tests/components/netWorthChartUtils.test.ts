import { describe, expect, test } from "bun:test";
import { getNetWorthYAxisDomain } from "../../src/components/Dashboard/netWorthChartUtils";

describe("getNetWorthYAxisDomain", () => {
  test("adds breathing room below the lowest point and above the highest point", () => {
    expect(getNetWorthYAxisDomain([480000, 500000, 520000])).toEqual([476800, 523200]);
  });

  test("uses fallback padding when all points are the same", () => {
    expect(getNetWorthYAxisDomain([500000, 500000, 500000])).toEqual([475000, 525000]);
  });
});
