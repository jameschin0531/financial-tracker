import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  getDefaultFinancialData,
  isWithinKeepaliveLimit,
  loadCachedFinancialData,
  saveCachedFinancialData,
} from "../../src/services/storageService";

const USER_ID = "user-123";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  (globalThis as any).window = { localStorage: storage };
});

afterEach(() => {
  delete (globalThis as any).window;
});

describe("financial data cache", () => {
  test("returns null when nothing is cached", () => {
    expect(loadCachedFinancialData(USER_ID)).toBeNull();
  });

  test("round-trips a dirty snapshot so it can be replayed after a reload", () => {
    const data = getDefaultFinancialData();
    data.assets = [
      { id: "a1", name: "Savings", category: "Cash", value: 100, assetType: "current", currency: "MYR" } as any,
    ];

    saveCachedFinancialData(USER_ID, data, true);

    const cached = loadCachedFinancialData(USER_ID);

    expect(cached?.dirty).toBe(true);
    expect(cached?.data.assets).toHaveLength(1);
    expect(cached?.data.assets[0]?.name).toBe("Savings");
  });

  test("keeps an acknowledged snapshot clean", () => {
    saveCachedFinancialData(USER_ID, getDefaultFinancialData(), false);

    expect(loadCachedFinancialData(USER_ID)?.dirty).toBe(false);
  });

  test("treats a legacy v1 cache as dirty so it gets pushed to the server", () => {
    const legacy = getDefaultFinancialData();
    legacy.assets = [
      { id: "legacy", name: "Old asset", category: "Cash", value: 5, assetType: "current", currency: "MYR" } as any,
    ];

    storage.setItem(`financial-data-cache:v1:${USER_ID}`, JSON.stringify(legacy));

    const cached = loadCachedFinancialData(USER_ID);

    expect(cached?.dirty).toBe(true);
    expect(cached?.data.assets[0]?.id).toBe("legacy");
  });

  test("prefers the current cache over a legacy one", () => {
    storage.setItem(`financial-data-cache:v1:${USER_ID}`, JSON.stringify(getDefaultFinancialData()));
    saveCachedFinancialData(USER_ID, getDefaultFinancialData(), false);

    expect(loadCachedFinancialData(USER_ID)?.dirty).toBe(false);
  });

  test("returns null instead of throwing on a corrupted cache entry", () => {
    storage.setItem(`financial-data-cache:v2:${USER_ID}`, "{not json");

    expect(loadCachedFinancialData(USER_ID)).toBeNull();
  });
});

describe("isWithinKeepaliveLimit", () => {
  test("accepts a small payload", () => {
    expect(isWithinKeepaliveLimit(JSON.stringify(getDefaultFinancialData()))).toBe(true);
  });

  test("rejects a payload beyond the browser keepalive cap", () => {
    expect(isWithinKeepaliveLimit("x".repeat(60_001))).toBe(false);
  });

  test("measures encoded bytes, not characters", () => {
    // 4-byte emoji: 20k characters is 80k bytes, over the cap.
    expect(isWithinKeepaliveLimit("\u{1F600}".repeat(20_000))).toBe(false);
  });
});
