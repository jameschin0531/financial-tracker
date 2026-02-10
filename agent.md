# Agent Guide - Financial Tracker

## Purpose
This repository is a Bun + React financial tracking app with Supabase authentication and cloud data storage.

Primary goals when working here:
- Keep the app stable and responsive on desktop and mobile.
- Preserve financial calculation correctness.
- Avoid breaking auth flow and data persistence.

## Tech Stack
- Runtime/build: `bun`
- Frontend: `react` + `react-dom`
- Charts: `recharts`
- Backend API (local): `server.ts` (Bun server on port `3000`)
- Auth/data: Supabase (`@supabase/supabase-js`)
- Desktop packaging: Electron

## Runbook
- Install deps: `bun install`
- Start dev server: `bun run dev`
- Build web app: `bun run build`
- Run desktop app: `bun run electron`

Notes:
- Main local URL: `http://localhost:3000`
- Auth requires valid Supabase env config.

## Important Paths
- App shell and routing:
  - `src/App.tsx`
  - `src/components/Layout/`
- Theming:
  - `src/components/Layout/Layout.module.css`
  - `src/context/ThemeContext.tsx`
  - `src/App.css`
- Pages:
  - `src/pages/`
- Financial state and CRUD:
  - `src/context/FinancialDataContext.tsx`
- Calculations and pricing:
  - `src/services/calculations.ts`
  - `src/services/stockCalculations.ts`
  - `src/services/cryptoCalculations.ts`
  - `src/services/stockPriceService.ts`
  - `src/services/cryptoPriceService.ts`
- Supabase setup:
  - `src/services/supabaseClient.ts`
  - `supabase/migrations/`

## Coding Rules
- Prefer minimal, targeted changes over broad refactors.
- Do not change data models without checking all calculations and page consumers.
- Keep TypeScript strictness in mind (`verbatimModuleSyntax` is enabled).
- Use ASCII-only UI labels/icons unless explicitly required.
- Reuse shared CSS variables and existing modules instead of adding one-off styles.
- Maintain mobile behavior (especially sidebar open/close interactions).

## UI/UX Direction
- Current design direction: crypto dashboard feel.
- Keep:
  - High-contrast dark-first theme.
  - Amber/cyan accent system from theme tokens.
  - Stable hover/focus states (no layout-jumping animations).
  - Accessible controls with clear text or SVG icons.

## Verification Checklist
Before saying a change is done:
1. Run `bun run build`.
2. Validate affected flow manually in browser:
   - Auth screen loads.
   - Main layout not blocked by sidebar (desktop + mobile).
   - Edited page/component renders and interactions work.
3. If touching calculations, verify numbers on Dashboard + related page.

## Safety
- Never commit secrets (`.env` must remain local).
- Avoid destructive git commands.
- If unexpected unrelated file changes appear, stop and confirm with user.
