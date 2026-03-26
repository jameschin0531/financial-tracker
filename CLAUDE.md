# Financial Tracker — Project Instructions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.x |
| Runtime / Build | Bun |
| Frontend | React 18 (SPA, no Next.js) |
| Desktop wrapper | Electron 28 |
| Database / Auth | Supabase (PostgreSQL) |
| Charts | Recharts 2.x |
| PDF export | html2canvas + jspdf |
| Deployment (web) | Vercel |

## Code Style

- **No `any`** — use `unknown` + type narrowing, or proper Recharts types for chart callbacks
- **Immutable updates** — always spread when modifying data; never mutate state directly
- **CSS Modules** for all component styles (`.module.css` co-located with the component)
- **No `console.log`** in production code — remove before committing
- File naming: `PascalCase` for components, `camelCase` for services/utils/hooks
- Keep components under 400 lines; extract logic into services or custom hooks

## Currency Convention

All monetary values are stored and displayed in **MYR** as the base currency.
USD and HKD entries carry an `exchangeRate` field (to MYR) captured at entry time.
Always use `formatCurrency()` from `src/utils/formatters.ts` for display.

## Key Types

Single source of truth: `src/types/financial.ts`
The `FinancialData` interface is the root shape flowing through `FinancialDataContext`.

## Testing

- Run tests: `bun test`
- Test files live in `tests/` mirroring `src/` structure
- Focus coverage on `src/services/` (calculation logic) and chart utilities

## Build & Run

| Task | Command |
|------|---------|
| Dev server (port 3000) | `bun run dev` |
| Web build | `bun run build` |
| Electron (dev) | `bun run electron:dev` |
| Electron (Windows installer) | `bun run electron:build:win` |

## Environment Variables

Required — create `.env` from `.env.example`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Optional (stock/crypto price providers):
- `ALPHA_VANTAGE_API_KEY`
- `TWELVE_DATA_API_KEY`
- `COINGECKO_API_KEY`

## Project Structure

```
src/
  App.tsx                  → Root: provider tree + page router (switch/case)
  types/financial.ts       → Shared types — source of truth for all data shapes
  context/                 → React contexts (Auth, FinancialData, Theme, AmountVisibility, Toast)
  services/                → Business logic (calculations, storage, price fetching)
  components/
    Dashboard/             → Dashboard cards, charts, allocation views
    Forms/                 → CRUD forms for assets/liabilities/income/expenses
    Layout/                → Header, Sidebar, Layout wrapper
    Stocks/ Crypto/        → Tracker UIs
    Export/                → PDF export
    UI/                    → Shared UI primitives (ThemeToggle, etc.)
  pages/                   → Page-level components (AssetsPage, CashFlowPage, …)
  utils/                   → Formatting helpers
api/                       → Bun server-side handlers (stock price aggregator, multi-provider)
electron/                  → Electron main + preload scripts
supabase/migrations/       → SQL migration files
tests/                     → Test suites mirroring src/ structure
```

## Conventions

- **Routing**: client-side switch/case in `App.tsx` — no router library
- **State**: React context only; no Redux or Zustand
- **Data persistence**: Supabase primary, `localStorage` cache fallback, `data/financial-data.json` for local dev
- **Stock prices**: multi-provider aggregator in `api/stockQuoteAggregator.ts` (Yahoo → Twelve Data fallback)
- **Commit style**: conventional commits (`feat:`, `fix:`, `refactor:`, etc.)
- **Supabase errors**: always log errors; never silently swallow them
