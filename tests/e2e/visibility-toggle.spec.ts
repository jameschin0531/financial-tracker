import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';

/**
 * Amount visibility toggle tests.
 *
 * The header contains a button that hides/shows all monetary amounts across
 * the application. Aria-label switches between:
 *   "Hide all amounts"  (amounts currently visible)
 *   "Show all amounts"  (amounts currently hidden)
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

test.describe('Amount visibility toggle', () => {
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

  test('visibility toggle button is present in the header', async ({ page }) => {
    await expect(appPage.visibilityToggle).toBeVisible();
  });

  test('toggle button initial aria-label is "Hide all amounts"', async ({ page }) => {
    // Default state: amounts are visible, button says hide.
    const button = page.getByRole('button', { name: /hide all amounts/i });
    await expect(button).toBeVisible();
  });

  test('clicking toggle changes aria-label to "Show all amounts"', async ({ page }) => {
    const hideBtn = page.getByRole('button', { name: /hide all amounts/i });
    await hideBtn.click();

    // After hiding, the label should flip.
    const showBtn = page.getByRole('button', { name: /show all amounts/i });
    await expect(showBtn).toBeVisible();
  });

  test('clicking toggle twice restores original "Hide all amounts" label', async ({ page }) => {
    const hideBtn = page.getByRole('button', { name: /hide all amounts/i });
    await hideBtn.click();

    const showBtn = page.getByRole('button', { name: /show all amounts/i });
    await showBtn.click();

    // Back to original state.
    await expect(page.getByRole('button', { name: /hide all amounts/i })).toBeVisible();
  });

  test('toggle persists across page navigation', async ({ page }) => {
    // Hide amounts on the dashboard.
    const hideBtn = page.getByRole('button', { name: /hide all amounts/i });
    await hideBtn.click();

    await expect(page.getByRole('button', { name: /show all amounts/i })).toBeVisible();

    // Navigate to Assets.
    await appPage.navigateTo('assets');

    // Toggle should still be in "show" state (amounts hidden).
    await expect(page.getByRole('button', { name: /show all amounts/i })).toBeVisible();
  });

  test('visibility toggle button is rendered inside the header element', async ({ page }) => {
    const headerLocator = page.locator('header');
    const toggleInsideHeader = headerLocator.getByRole('button', {
      name: /hide all amounts|show all amounts/i,
    });
    await expect(toggleInsideHeader).toBeVisible();
  });
});
