import { describe, expect, test } from "bun:test";
import { shouldSkipBackgroundRefresh } from "../../src/context/refreshGuards";

describe("shouldSkipBackgroundRefresh", () => {
  test("skips non-blocking refresh when a debounced save is pending", () => {
    expect(
      shouldSkipBackgroundRefresh({
        blockUi: false,
        hasPendingSaveTimeout: true,
        isSaveInFlight: false,
      }),
    ).toBe(true);
  });

  test("skips non-blocking refresh when save request is in-flight", () => {
    expect(
      shouldSkipBackgroundRefresh({
        blockUi: false,
        hasPendingSaveTimeout: false,
        isSaveInFlight: true,
      }),
    ).toBe(true);
  });

  test("does not skip blocking refresh", () => {
    expect(
      shouldSkipBackgroundRefresh({
        blockUi: true,
        hasPendingSaveTimeout: true,
        isSaveInFlight: true,
      }),
    ).toBe(false);
  });

  test("does not skip non-blocking refresh when no pending save", () => {
    expect(
      shouldSkipBackgroundRefresh({
        blockUi: false,
        hasPendingSaveTimeout: false,
        isSaveInFlight: false,
      }),
    ).toBe(false);
  });
});
