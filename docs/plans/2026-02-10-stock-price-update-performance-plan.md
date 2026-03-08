# Stock Price Update Performance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce stock refresh latency from multi-second/per-symbol behavior to fast batched refresh with graceful fallbacks and predictable performance.

**Architecture:** Move stock quote fetching to a server-side aggregator endpoint so the client no longer uses slow public CORS proxies. Use a provider chain with caching: Yahoo batch (fast/no key, unofficial) as primary, Twelve Data (official, free tier) as optional keyed fallback, Alpha Vantage as last fallback. Return partial results quickly and update UI with status metadata.

**Tech Stack:** Bun server (`server.ts`), React, TypeScript strict mode, fetch API, Bun test.

---

## Performance Targets
- P50 refresh for 20 symbols: <= 2.0s
- P95 refresh for 20 symbols: <= 5.0s
- Button-to-first-update perceived latency: <= 1.0s
- At least partial result returned even when one provider fails

## Provider Strategy
- **Primary:** Yahoo Finance batch endpoint from server (no browser CORS penalty, no allorigins proxy hop).
- **Fallback 1:** Twelve Data (official API key, free tier credits) for missing symbols.
- **Fallback 2:** Existing Alpha Vantage logic for last-resort coverage.

## Task 1: Baseline + SLA Guardrails

**Files:**
- Create: `tests/perf/stock-refresh-baseline.test.ts`
- Modify: `src/pages/StockTrackerPage.tsx`

**Step 1: Write failing baseline test**
- Add a perf-oriented test scaffold with a mock fetch harness.
- Assert current implementation exceeds desired timeout budget in synthetic scenario.

**Step 2: Run test to verify it fails**
- Run: `bun test tests/perf/stock-refresh-baseline.test.ts`
- Expected: FAIL due current slow path assumptions.

**Step 3: Add UI instrumentation hook**
- Add timing markers around refresh click flow (`performance.now()` + console timing label).

**Step 4: Verify instrumentation**
- Run app and trigger refresh once.
- Expected: timing log appears with total milliseconds.

**Step 5: Commit**
- `git commit -m "test: add stock refresh baseline instrumentation"`

## Task 2: Server Aggregator Endpoint

**Files:**
- Create: `api/stockQuoteAggregator.ts`
- Create: `api/providers/yahooProvider.ts`
- Create: `api/providers/twelveDataProvider.ts`
- Modify: `server.ts`
- Test: `tests/api/stockQuoteAggregator.test.ts`

**Step 1: Write failing server aggregator tests**
- Test: merges quotes from providers, deduplicates symbols, returns partial results, never throws on single-provider failure.

**Step 2: Run test to verify it fails**
- Run: `bun test tests/api/stockQuoteAggregator.test.ts`
- Expected: FAIL (module/handlers not implemented).

**Step 3: Implement minimal aggregator**
- Add `GET /api/stock-prices?symbols=AAPL,TSLA`.
- Parse/validate symbols.
- Call provider chain in order.
- Return JSON:
  - `prices: Record<string, number>`
  - `sourceBySymbol: Record<string, "yahoo" | "twelvedata" | "alphavantage">`
  - `missing: string[]`
  - `durationMs: number`

**Step 4: Run tests to green**
- Run: `bun test tests/api/stockQuoteAggregator.test.ts`
- Expected: PASS.

**Step 5: Commit**
- `git commit -m "feat: add server-side stock quote aggregator endpoint"`

## Task 3: Server Cache + Timeout/Retry Policy

**Files:**
- Modify: `api/stockQuoteAggregator.ts`
- Create: `api/stockQuoteCache.ts`
- Test: `tests/api/stockQuoteCache.test.ts`

**Step 1: Write failing cache tests**
- TTL behavior (fresh hit, stale miss, partial-fill merge).
- Timeout fallback behavior for slow provider calls.

**Step 2: Run test to verify fail**
- Run: `bun test tests/api/stockQuoteCache.test.ts`
- Expected: FAIL.

**Step 3: Implement cache + policy**
- In-memory symbol cache with short TTL (30-60s).
- Provider timeout per call (e.g. 1500ms) and bounded retries (max 1 retry for primary provider only).
- Return cached value if provider timeout occurs.

**Step 4: Run tests**
- Run: `bun test tests/api/stockQuoteCache.test.ts`
- Expected: PASS.

**Step 5: Commit**
- `git commit -m "feat: add quote cache and timeout fallback policy"`

## Task 4: Client Refactor to Local Endpoint

**Files:**
- Modify: `src/services/stockPriceService.ts`
- Test: `tests/services/stockPriceService.test.ts`

**Step 1: Write failing client service tests**
- Assert `getStockPrices()` calls local `/api/stock-prices` once for batched symbols.
- Assert handles `missing` and partial `prices` safely.

**Step 2: Run test to verify fail**
- Run: `bun test tests/services/stockPriceService.test.ts`
- Expected: FAIL.

**Step 3: Implement minimal client**
- Replace browser-side provider logic with local endpoint call.
- Keep existing function signatures so calling code remains unchanged.
- Preserve return type `Map<string, number>`.

**Step 4: Run tests**
- Run: `bun test tests/services/stockPriceService.test.ts`
- Expected: PASS.

**Step 5: Commit**
- `git commit -m "refactor: move stock price fetching to local api endpoint"`

## Task 5: UX Improvements for Refresh Flow

**Files:**
- Modify: `src/pages/StockTrackerPage.tsx`
- Modify: `src/pages/StockTracker.module.css`

**Step 1: Add refresh state model**
- Add `refreshMeta` state (`durationMs`, `updatedCount`, `missingCount`, `sourceSummary`).

**Step 2: Update button behavior**
- Keep current disabled state, add optimistic status text:
  - `Updating prices...`
  - `Updated 18/20 in 1.8s`

**Step 3: Surface partial success**
- Show non-blocking warning for missing symbols instead of generic failure alert.

**Step 4: Manual verify**
- Trigger refresh with mixed valid/invalid symbols.
- Expected: partial success shown and table updates quickly.

**Step 5: Commit**
- `git commit -m "feat: improve stock refresh status and partial result UX"`

## Task 6: Config + Documentation

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `QUICK_START.md`

**Step 1: Add config**
- Add optional `TWELVE_DATA_API_KEY`.

**Step 2: Document provider chain**
- Explain order and fallback behavior.
- Add note that Yahoo path is unofficial and Twelve Data is preferred for reliability.

**Step 3: Add troubleshooting section**
- Include rate limit symptoms and expected behavior.

**Step 4: Commit**
- `git commit -m "docs: add stock provider config and fallback documentation"`

## Task 7: End-to-End Verification

**Files:**
- Modify (if needed): `server.ts`, `src/services/stockPriceService.ts`, `src/pages/StockTrackerPage.tsx`

**Step 1: Run tests**
- `bun test`

**Step 2: Run build**
- `bun run build`

**Step 3: Manual functional checks**
- Dev run: `bun run dev`
- Validate:
  - Refresh works for 1, 10, 20 symbols
  - Partial response handling
  - No UI freeze
  - Mobile view still usable

**Step 4: Compare with baseline**
- Ensure timing logs meet P50/P95 targets in local scenario.

**Step 5: Final commit**
- `git commit -m "feat: accelerate stock refresh with server aggregation and fallback providers"`

---

## Rollout Notes
- Phase 1 can ship with Yahoo server-side + cache only (fastest impact).
- Phase 2 adds Twelve Data fallback for reliability.
- Phase 3 adds richer UX and provider analytics.

## Risk Register
- Yahoo endpoint is unofficial and may change.
- Free-tier quotas can still throttle fallback APIs.
- Need to avoid exposing provider secrets to client.

## External References
- Alpha Vantage support (free-tier request limits): https://www.alphavantage.co/support/#support
- Alpha Vantage docs (quote limitations and premium real-time notes): https://www.alphavantage.co/documentation/
- Twelve Data Price endpoint (credits model): https://twelvedata.com/docs#/price
- Twelve Data pricing (free plan limits): https://twelvedata.com/pricing
