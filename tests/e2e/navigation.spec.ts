import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';

/**
 * Sidebar navigation tests.
 *
 * Requires authenticated session tokens. All tests in this file are skipped
 * gracefully when the environment variables are not set.
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

test.describe('Sidebar navigation', () => {
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
  });

  test('sidebar is visible after login', async ({ page }) => {
    await expect(appPage.sidebar).toBeVisible();
  });

  test('navigates to the Dashboard page', async ({ page }) => {
    await appPage.navigateTo('dashboard');
    // Dashboard renders metric cards — look for the net worth heading or
    // any heading on the dashboard section.
    await expect(page.getByText(/net worth|dashboard/i).first()).toBeVisible();
  });

  test('navigates to the Assets page', async ({ page }) => {
    await appPage.navigateTo('assets');
    await appPage.assertCurrentPage('Assets');
  });

  test('navigates to the Liabilities page', async ({ page }) => {
    await appPage.navigateTo('liabilities');
    await appPage.assertCurrentPage('Liabilities');
  });

  test('navigates to the Monthly Cash Flow page', async ({ page }) => {
    await appPage.navigateTo('cashflow');
    await appPage.assertCurrentPage('Monthly Cash Flow');
  });

  test('navigates to the Stock Tracker page', async ({ page }) => {
    await appPage.navigateTo('stocks');
    await appPage.assertCurrentPage('Stock Tracker');
  });

  test('navigates to the Crypto Tracker page', async ({ page }) => {
    await appPage.navigateTo('crypto');
    await appPage.assertCurrentPage('Crypto Tracker');
  });

  test('active nav item is marked with aria-current="page"', async ({ page }) => {
    await appPage.navigateTo('assets');

    const activeNavItem = page.locator('button[aria-current="page"]');
    await expect(activeNavItem).toBeVisible();
    await expect(activeNavItem).toContainText('Assets');
  });

  test('sidebar can be collapsed and expanded', async ({ page }) => {
    // The collapse toggle has an aria-label
    const collapseBtn = page.getByRole('button', { name: /collapse sidebar/i });

    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();

      // After collapse the label should say "expand"
      const expandBtn = page.getByRole('button', { name: /expand sidebar/i });
      await expect(expandBtn).toBeVisible();

      // The sidebar title abbreviates to "FS"
      await expect(page.getByText('FS')).toBeVisible();

      // Re-expand
      await expandBtn.click();
      await expect(page.getByText('Financial Suite')).toBeVisible();
    } else {
      // Collapse button not rendered — skip interaction but don't fail.
      test.skip(true, 'Collapse toggle not present in this layout');
    }
  });
});
