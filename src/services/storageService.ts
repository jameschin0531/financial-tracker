import type { FinancialData } from '../types/financial';
import { getSupabase, getSupabaseCredentials, isSupabaseInitialized } from './supabaseClient';

const FINANCIAL_DATA_CACHE_VERSION = 'v3';
const LEGACY_CACHE_VERSIONS = ['v2', 'v1'];

/** Where a local snapshot is parked when it cannot be safely replayed. */
const getConflictBackupKey = (userId: string): string => {
  return `financial-data-conflict:${userId}`;
};

/**
 * A cached dataset plus whether it holds edits the server has not acknowledged.
 * A dirty entry is replayed to the server on the next load instead of being
 * silently replaced by the (older) server copy.
 */
export interface CachedFinancialData {
  data: FinancialData;
  dirty: boolean;
  /**
   * `updated_at` of the server row this snapshot was built from. A dirty
   * snapshot may only be replayed onto a server row still at this revision -
   * otherwise the row has been written elsewhere since, and replaying would
   * destroy that newer data.
   */
  serverUpdatedAt: string | null;
}

interface CacheEnvelope {
  version: string;
  data: FinancialData;
  dirty: boolean;
  serverUpdatedAt: string | null;
}

export interface RemoteFinancialData {
  data: FinancialData;
  updatedAt: string | null;
}

export interface DirtyReplayInput {
  cachedServerUpdatedAt: string | null;
  currentServerUpdatedAt: string | null;
}

/**
 * Whether a dirty cached snapshot may be pushed over the current server row.
 *
 * Only when the server is still at the exact revision the snapshot was built
 * from. An unknown revision on either side is not evidence of safety - it is
 * the case where a stale snapshot would silently overwrite good data.
 */
export const canReplayDirtyCache = ({
  cachedServerUpdatedAt,
  currentServerUpdatedAt,
}: DirtyReplayInput): boolean => {
  if (!cachedServerUpdatedAt || !currentServerUpdatedAt) {
    return false;
  }

  return cachedServerUpdatedAt === currentServerUpdatedAt;
};

const getFinancialDataCacheKey = (userId: string, version = FINANCIAL_DATA_CACHE_VERSION): string => {
  return `financial-data-cache:${version}:${userId}`;
};

export const migrateDataFormat = (data: any): FinancialData => {
  const defaultAssetCategories = ['Cash', 'Savings Account', 'Checking Account', 'Investment', 'Retirement Account', 'Real Estate', 'Vehicle', 'Other'];
  const defaultLiabilityCategories = ['Credit Card', 'Personal Loan', 'Mortgage', 'Auto Loan', 'Student Loan', 'Medical Debt', 'Other'];
  const defaultExpenseCategories = ['Housing', 'Food', 'Transportation', 'Utilities', 'Healthcare', 'Entertainment', 'Shopping', 'Education', 'Insurance', 'Other'];
  
  // Ensure categories exist
  if (!data.assetCategories) {
    data.assetCategories = defaultAssetCategories;
  }
  if (!data.liabilityCategories) {
    data.liabilityCategories = defaultLiabilityCategories;
  }
  if (!data.expenseCategories) {
    data.expenseCategories = defaultExpenseCategories;
  }
  
  // Migrate assets without assetType (default to 'current')
  if (data.assets && Array.isArray(data.assets)) {
    data.assets = data.assets.map((asset: any) => ({
      ...asset,
      assetType: asset.assetType || 'current',
      currency: asset.currency || 'MYR',
    }));
  }
  
  // Migrate liabilities, income, expenses without currency
  if (data.liabilities && Array.isArray(data.liabilities)) {
    data.liabilities = data.liabilities.map((liability: any) => ({
      ...liability,
      currency: liability.currency || 'MYR',
    }));
  }
  
  if (data.income && Array.isArray(data.income)) {
    data.income = data.income.map((income: any) => ({
      ...income,
      currency: income.currency || 'MYR',
    }));
  }
  
  if (data.expenses && Array.isArray(data.expenses)) {
    data.expenses = data.expenses.map((expense: any) => ({
      ...expense,
      currency: expense.currency || 'MYR',
    }));
  }
  
  // Ensure stock-related arrays exist
  if (!data.stockHoldings) {
    data.stockHoldings = [];
  }
  if (!data.cryptoHoldings) {
    data.cryptoHoldings = [];
  }
  if (!data.tradingAccounts) {
    data.tradingAccounts = [];
  }
  if (!data.cryptoAccounts) {
    data.cryptoAccounts = [];
  }
  if (!data.deposits) {
    data.deposits = [];
  }
  
  return data as FinancialData;
};

const getDefaultData = (): FinancialData => ({
  assets: [],
  liabilities: [],
  income: [],
  expenses: [],
  assetCategories: ['Cash', 'Savings Account', 'Checking Account', 'Investment', 'Retirement Account', 'Real Estate', 'Vehicle', 'Other'],
  liabilityCategories: ['Credit Card', 'Personal Loan', 'Mortgage', 'Auto Loan', 'Student Loan', 'Medical Debt', 'Other'],
  expenseCategories: ['Housing', 'Food', 'Transportation', 'Utilities', 'Healthcare', 'Entertainment', 'Shopping', 'Education', 'Insurance', 'Other'],
  stockHoldings: [],
  cryptoHoldings: [],
  tradingAccounts: [],
  cryptoAccounts: [],
  deposits: [],
});

export const getDefaultFinancialData = getDefaultData;

/**
 * Fetch the server snapshot.
 *
 * Throws on any failure other than "row does not exist". Returning defaults on
 * error would replace live state with an empty dataset, which the next mutation
 * would then persist over the user's real records.
 */
export const loadFinancialData = async (userId: string): Promise<RemoteFinancialData> => {
  if (!isSupabaseInitialized()) {
    throw new Error('Supabase not initialized');
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('financial_data')
    .select('data, updated_at')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No row yet for this user: an empty dataset is the correct snapshot.
      return { data: getDefaultData(), updatedAt: null };
    }
    throw error;
  }

  const updatedAt = (data?.updated_at as string | null) ?? null;

  if (data && data.data) {
    return { data: migrateDataFormat(data.data), updatedAt };
  }

  return { data: getDefaultData(), updatedAt };
};

const readCacheEntry = (key: string): unknown => {
  const cached = window.localStorage.getItem(key);
  return cached ? JSON.parse(cached) : null;
};

const isCacheEnvelope = (value: unknown): value is CacheEnvelope => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    'data' in value &&
    typeof (value as CacheEnvelope).data === 'object'
  );
};

export const loadCachedFinancialData = (userId: string): CachedFinancialData | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const parsed = readCacheEntry(getFinancialDataCacheKey(userId));

    if (isCacheEnvelope(parsed)) {
      return {
        data: migrateDataFormat(parsed.data),
        dirty: parsed.dirty === true,
        serverUpdatedAt: parsed.serverUpdatedAt ?? null,
      };
    }

    // Older caches carry no server revision, so a dirty claim in one cannot be
    // verified against the server. They are read as clean: an unverifiable
    // replay would overwrite the whole dataset, which is far worse than
    // re-fetching a snapshot the server already has.
    for (const version of LEGACY_CACHE_VERSIONS) {
      const legacy = readCacheEntry(getFinancialDataCacheKey(userId, version));
      if (legacy) {
        const legacyData = isCacheEnvelope(legacy) ? legacy.data : legacy;
        return { data: migrateDataFormat(legacyData), dirty: false, serverUpdatedAt: null };
      }
    }

    return null;
  } catch (error) {
    console.error('Error loading cached financial data:', error);
    return null;
  }
};

export const saveCachedFinancialData = (
  userId: string,
  data: FinancialData,
  dirty: boolean,
  serverUpdatedAt: string | null,
): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const envelope: CacheEnvelope = {
      version: FINANCIAL_DATA_CACHE_VERSION,
      data,
      dirty,
      serverUpdatedAt,
    };
    window.localStorage.setItem(getFinancialDataCacheKey(userId), JSON.stringify(envelope));
  } catch (error) {
    console.error('Error saving cached financial data:', error);
  }
};

/**
 * Park a local snapshot that could not be replayed, so a conflict never means
 * the data is simply gone.
 */
export const backupUnreplayableSnapshot = (userId: string, data: FinancialData): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    window.localStorage.setItem(getConflictBackupKey(userId), JSON.stringify({
      savedAt: new Date().toISOString(),
      data,
    }));
  } catch (error) {
    console.error('Error backing up unreplayable snapshot:', error);
  }
};

/**
 * Persist to Supabase and resolve with the `updated_at` the server stored.
 *
 * `updated_at` is deliberately not sent: a BEFORE UPDATE trigger stamps it with
 * the database clock, so the stored value is read back from the row. That value
 * is what later tells a stale cache apart from a current one.
 */
export const saveFinancialData = async (userId: string, data: FinancialData): Promise<string | null> => {
  if (!isSupabaseInitialized()) {
    throw new Error('Supabase not initialized');
  }

  const supabase = getSupabase();

  const { data: saved, error } = await supabase
    .from('financial_data')
    .upsert({
      user_id: userId,
      data: data,
    }, {
      onConflict: 'user_id',
    })
    .select('updated_at')
    .single();

  if (error) {
    throw error;
  }

  return (saved?.updated_at as string | null) ?? null;
};

/**
 * Browsers cap the combined body size of in-flight `keepalive` requests at
 * 64 KiB and reject anything larger, so oversized payloads must not take this
 * path at all.
 */
const KEEPALIVE_BODY_LIMIT_BYTES = 60_000;

export const isWithinKeepaliveLimit = (body: string): boolean => {
  const byteLength = typeof TextEncoder === 'function'
    ? new TextEncoder().encode(body).length
    : body.length;

  return byteLength <= KEEPALIVE_BODY_LIMIT_BYTES;
};

/**
 * Best-effort save issued while the page is being torn down (tab close, reload,
 * navigation away). `keepalive` lets the browser finish the request after the
 * document is gone, which a normal supabase-js call cannot survive.
 *
 * The response can never be observed, so this is a delivery attempt only - the
 * caller must leave the cache entry marked dirty so a failed attempt is still
 * replayed on the next load.
 *
 * Returns false when no request could be started (missing credentials, or a
 * payload too large for the keepalive limit).
 */
export const saveFinancialDataOnUnload = (
  userId: string,
  data: FinancialData,
  accessToken: string | null,
): boolean => {
  try {
    const credentials = getSupabaseCredentials();

    if (!credentials || !accessToken || typeof fetch !== 'function') {
      return false;
    }

    const body = JSON.stringify({ user_id: userId, data: data });

    if (!isWithinKeepaliveLimit(body)) {
      console.warn('Financial data too large for an unload flush; deferring to the cached replay');
      return false;
    }

    void fetch(`${credentials.url}/rest/v1/financial_data?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        apikey: credentials.anonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body,
      keepalive: true,
    }).catch((error) => {
      console.error('Error flushing financial data on unload:', error);
    });

    return true;
  } catch (error) {
    console.error('Error flushing financial data on unload:', error);
    return false;
  }
};
