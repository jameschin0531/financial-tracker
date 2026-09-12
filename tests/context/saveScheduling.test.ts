import { describe, expect, test } from "bun:test";
import { computeRetryBackoffMs, SAVE_RETRY_MAX_MS } from "../../src/context/saveScheduling";

describe("computeRetryBackoffMs", () => {
  test("grows exponentially from the base delay", () => {
    expect(computeRetryBackoffMs(1, 2000, 30000)).toBe(2000);
    expect(computeRetryBackoffMs(2, 2000, 30000)).toBe(4000);
    expect(computeRetryBackoffMs(3, 2000, 30000)).toBe(8000);
  });

  test("caps at the maximum so a long outage still retries predictably", () => {
    expect(computeRetryBackoffMs(20, 2000, 30000)).toBe(30000);
    expect(computeRetryBackoffMs(99)).toBe(SAVE_RETRY_MAX_MS);
  });

  test("treats a zeroth attempt as the base delay", () => {
    expect(computeRetryBackoffMs(0, 2000, 30000)).toBe(2000);
  });
});
