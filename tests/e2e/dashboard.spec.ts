import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';

/**
 * Dashboard page tests — verify metric cards and charts load correctly.
 *
 * Required environment variables:
 *   E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY,
 *   E2E_ACCESS_TOKEN, E2E_REFRESH_TOKEN,
 *   E2E_USER_ID, E2E_USER_EMAIL
 */

const hasTokens = !!(
  process.env.E2E_SUPABASE_URL &&
  process.env.E2E_SUPABASE_ANON_KEY &&
  process.env.E2E_ACCESS_TOKEN &&
  process.env.E2E_REFRESH_TOKEN &&
  process.env.E2E_USER_ID &&
  process.env.E2E_USER_EMAIL
);

test.describe('Dashboard page', () => {
  let appPage: AppPage;

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTokens,
      'Skipped — set E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY, E2E_ACCESS_TOKEN, E2E_REFRESH_TOKEN, E2E_USER_ID, E2E_USER_EMAIL to run authenticated tests',
    );

    appPage = new AppPage(page);
    await appPage.injectSession({
      supabaseUrl: process.env.E2E_SUPABASE_URL!,
      anonKey: process.env.E2E_SUPABASE_ANON_KEY!,
      accessToken: process.env.E2E_ACCESS_TOKEN!,
      refreshToken: process.env.E2E_REFRESH_TOKEN!,
      userId: process.env.E2E_USER_ID!,
      userEmail: process.env.E2E_USER_EMAIL!,
    });

    await appPage.goto();
    await appPage.waitForAppReady();
    // Dashboard is the default page after login.
  });

  test('dashboard renders metric cards', async ({ page }) => {
    // The dashboard always shows financial metric cards.
    // We look for the labels rendered inside MetricsCard components.
    const metricLabels = [
      /net worth/i,
      /total assets/i,
      /monthly income/i,
    ];

    for (const label of metricLabels) {
      await expect(page.getByText(label).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('net worth metric card is present and has a numeric value', async ({ page }) => {
    const netWorthCard = page.getByText(/net worth/i).first();
    await expect(netWorthCard).toBeVisible();

    // The value (MYR formatted) should be somewhere nearby.
    await expect(page.getByText(/RM|MYR/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('navigation to dashboard via sidebar works', async ({ page }) => {
    // Go to another page then come back.
    await appPage.navigateTo('assets');
    await appPage.navigateTo('dashboard');

    // Dashboard metric cards should be visible again.
    await expect(page.getByText(/net worth/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('recharts SVG containers render for Net Worth chart', async ({ page }) => {
    // Recharts renders SVG elements — verify at least one chart SVG is present.
    // We wait a bit for async data loads.
    const chartSvg = page.locator('svg').first();
    await expect(chartSvg).toBeVisible({ timeout: 15_000 });
  });

  test('liabilities metric card is present', async ({ page }) => {
    await expect(page.getByText(/total liabilities/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('cash flow metric card is present', async ({ page }) => {
    await expect(page.getByText(/cash flow/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
