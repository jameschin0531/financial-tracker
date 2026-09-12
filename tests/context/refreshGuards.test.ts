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

  test("skips a blocking refresh too when local state is dirty", () => {
    // A blocking initial load can run while a cached dirty snapshot is still
    // waiting to be pushed; the server copy must not overwrite it.
    expect(
      shouldSkipBackgroundRefresh({
        blockUi: true,
        hasPendingSaveTimeout: false,
        isSaveInFlight: false,
        isLocalDirty: true,
      }),
    ).toBe(true);
  });

  test("does not skip a blocking refresh when nothing is pending", () => {
    expect(
      shouldSkipBackgroundRefresh({
        blockUi: true,
        hasPendingSaveTimeout: false,
        isSaveInFlight: false,
        isLocalDirty: false,
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
