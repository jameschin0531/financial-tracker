import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  backupUnreplayableSnapshot,
  canReplayDirtyCache,
  getDefaultFinancialData,
  isWithinKeepaliveLimit,
  loadCachedFinancialData,
  saveCachedFinancialData,
} from "../../src/services/storageService";

const USER_ID = "user-123";
const REV_A = "2026-09-13T10:00:00.000Z";
const REV_B = "2026-09-13T18:30:00.000Z";

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

const assetNamed = (name: string) => ({
  id: name,
  name,
  category: "Cash",
  value: 100,
  assetType: "current",
  currency: "MYR",
}) as any;

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

  test("round-trips a dirty snapshot with the revision it was built from", () => {
    const data = getDefaultFinancialData();
    data.assets = [assetNamed("Savings")];

    saveCachedFinancialData(USER_ID, data, true, REV_A);

    const cached = loadCachedFinancialData(USER_ID);

    expect(cached?.dirty).toBe(true);
    expect(cached?.serverUpdatedAt).toBe(REV_A);
    expect(cached?.data.assets[0]?.name).toBe("Savings");
  });

  test("keeps an acknowledged snapshot clean", () => {
    saveCachedFinancialData(USER_ID, getDefaultFinancialData(), false, REV_A);

    expect(loadCachedFinancialData(USER_ID)?.dirty).toBe(false);
  });

  // Regression: a v1 cache read as dirty was replayed over the server on the
  // first load after upgrading, reverting every record saved since.
  test("reads a legacy v1 cache as clean, never as unsaved work", () => {
    const legacy = getDefaultFinancialData();
    legacy.assets = [assetNamed("stale")];

    storage.setItem(`financial-data-cache:v1:${USER_ID}`, JSON.stringify(legacy));

    const cached = loadCachedFinancialData(USER_ID);

    expect(cached?.dirty).toBe(false);
    expect(cached?.serverUpdatedAt).toBeNull();
    expect(cached?.data.assets[0]?.id).toBe("stale");
  });

  test("reads a legacy v2 envelope as clean even when it claims to be dirty", () => {
    const legacy = getDefaultFinancialData();
    legacy.assets = [assetNamed("stale-v2")];

    storage.setItem(
      `financial-data-cache:v2:${USER_ID}`,
      JSON.stringify({ version: "v2", data: legacy, dirty: true }),
    );

    const cached = loadCachedFinancialData(USER_ID);

    expect(cached?.dirty).toBe(false);
    expect(cached?.data.assets[0]?.id).toBe("stale-v2");
  });

  test("prefers the current cache over a legacy one", () => {
    storage.setItem(`financial-data-cache:v1:${USER_ID}`, JSON.stringify(getDefaultFinancialData()));
    saveCachedFinancialData(USER_ID, getDefaultFinancialData(), true, REV_A);

    expect(loadCachedFinancialData(USER_ID)?.dirty).toBe(true);
  });

  test("returns null instead of throwing on a corrupted cache entry", () => {
    storage.setItem(`financial-data-cache:v3:${USER_ID}`, "{not json");

    expect(loadCachedFinancialData(USER_ID)).toBeNull();
  });

  test("parks an unreplayable snapshot under a backup key", () => {
    const data = getDefaultFinancialData();
    data.assets = [assetNamed("rescued")];

    backupUnreplayableSnapshot(USER_ID, data);

    const raw = storage.getItem(`financial-data-conflict:${USER_ID}`);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw as string);
    expect(parsed.data.assets[0]?.id).toBe("rescued");
    expect(typeof parsed.savedAt).toBe("string");
  });
});

describe("canReplayDirtyCache", () => {
  test("replays onto the exact revision the snapshot was built from", () => {
    expect(
      canReplayDirtyCache({ cachedServerUpdatedAt: REV_A, currentServerUpdatedAt: REV_A }),
    ).toBe(true);
  });

  test("refuses when the server row has moved on", () => {
    expect(
      canReplayDirtyCache({ cachedServerUpdatedAt: REV_A, currentServerUpdatedAt: REV_B }),
    ).toBe(false);
  });

  test("refuses when the snapshot has no recorded revision", () => {
    expect(
      canReplayDirtyCache({ cachedServerUpdatedAt: null, currentServerUpdatedAt: REV_A }),
    ).toBe(false);
  });

  test("refuses when the server revision is unknown", () => {
    expect(
      canReplayDirtyCache({ cachedServerUpdatedAt: REV_A, currentServerUpdatedAt: null }),
    ).toBe(false);
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
    expect(isWithinKeepaliveLimit("\u{1F600}".repeat(20_000))).toBe(false);
  });
});
