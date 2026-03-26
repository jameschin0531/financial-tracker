import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config(); // loads .env into process.env

/**
 * Playwright E2E configuration for the Financial Tracker application.
 *
 * Authentication notes:
 * - The app uses Google OAuth (Supabase) — automated login is not possible.
 * - Authenticated tests inject a real Supabase session token via localStorage.
 * - Provide the following environment variables to enable authenticated tests:
 *
 *   E2E_SUPABASE_URL       — your Supabase project URL
 *   E2E_SUPABASE_ANON_KEY  — your Supabase anon key
 *   E2E_ACCESS_TOKEN       — a valid Supabase access token (JWT)
 *   E2E_REFRESH_TOKEN      — the matching Supabase refresh token
 *   E2E_USER_ID            — the Supabase user UUID
 *   E2E_USER_EMAIL         — the user's email address
 *
 * Without these variables the authenticated tests are skipped gracefully.
 *
 * Dev server:
 * - The dev server (`bun run dev`) must be running on http://localhost:3000.
 * - Set PLAYWRIGHT_NO_SERVER=1 to disable the automatic server check.
 */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start the dev server automatically when not disabled.
  // Remove or comment-out this block if you prefer to start the server manually.
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        command: 'bun run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
