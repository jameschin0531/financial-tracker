import { describe, expect, test } from "bun:test";
import { shouldSkipBackgroundRefresh } from "../../src/context/refreshGuards";

describe("shouldSkipBackgroundRefresh", () => {
  test("skips non-blocking refresh when a debounced save is pending", () => {
    expect(
      shouldSkipBackgroundRefresh({
        blockUi: false,
        hasPendingSaveTimeout: true,
        isSaveInFlight: false,
        isLocalDirty: false,
      }),
    ).toBe(true);
  });

  test("skips non-blocking refresh when save request is in-flight", () => {
    expect(
      shouldSkipBackgroundRefresh({
        blockUi: false,
        hasPendingSaveTimeout: false,
        isSaveInFlight: true,
        isLocalDirty: false,
      }),
    ).toBe(true);
  });

  test("skips non-blocking refresh when local state is dirty", () => {
    expect(
      shouldSkipBackgroundRefresh({
        blockUi: false,
        hasPendingSaveTimeout: false,
        isSaveInFlight: false,
        isLocalDirty: true,
      }),
    ).toBe(true);
  });

  test("does not skip blocking refresh even when dirty", () => {
    expect(
      shouldSkipBackgroundRefresh({
        blockUi: true,
        hasPendingSaveTimeout: true,
        isSaveInFlight: true,
        isLocalDirty: true,
      }),
    ).toBe(false);
  });

  test("does not skip non-blocking refresh when no pending save", () => {
    expect(
      shouldSkipBackgroundRefresh({
        blockUi: false,
        hasPendingSaveTimeout: false,
        isSaveInFlight: false,
        isLocalDirty: false,
      }),
    ).toBe(false);
  });
});
