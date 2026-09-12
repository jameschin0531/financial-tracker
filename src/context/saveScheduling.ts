export const SAVE_RETRY_BASE_MS = 2000;
export const SAVE_RETRY_MAX_MS = 30000;

/**
 * Exponential backoff for consecutive save failures, capped so a long outage
 * still retries at a predictable interval.
 */
export const computeRetryBackoffMs = (
  attempt: number,
  baseMs: number = SAVE_RETRY_BASE_MS,
  maxMs: number = SAVE_RETRY_MAX_MS,
): number => {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(maxMs, baseMs * 2 ** exponent);
};
