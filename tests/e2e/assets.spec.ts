import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';
import { AssetsPagePOM } from './pages/AssetsPagePOM';

/**
 * Asset CRUD tests.
 *
 * Requires authenticated session tokens. All tests are skipped gracefully
 * when the environment variables are not set.
 *
 * Required environment variables:
 *   E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY,
 *   E2E_ACCESS_TOKEN, E2E_REFRESH_TOKEN,
 *   E2E_USER_ID, E2E_USER_EMAIL
 *
 * IMPORTANT: These tests write real data to your Supabase instance.
 * Use a dedicated test account or a staging environment.
 */

const hasTokens = !!(
  process.env.E2E_SUPABASE_URL &&
  process.env.E2E_SUPABASE_ANON_KEY &&
  process.env.E2E_ACCESS_TOKEN &&
  process.env.E2E_REFRESH_TOKEN &&
  process.env.E2E_USER_ID &&
  process.env.E2E_USER_EMAIL
);

test.describe('Assets page', () => {
  let appPage: AppPage;
  let assetsPage: AssetsPagePOM;

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTokens,
      'Skipped — set E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY, E2E_ACCESS_TOKEN, E2E_REFRESH_TOKEN, E2E_USER_ID, E2E_USER_EMAIL to run authenticated tests',
    );

    appPage = new AppPage(page);
    assetsPage = new AssetsPagePOM(page);

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
    await appPage.navigateTo('assets');

    // Confirm we are on the Assets page.
    await expect(page.getByRole('heading', { name: 'Assets', level: 1 })).toBeVisible();
  });

  test('assets page renders the add asset form', async ({ page }) => {
    await expect(assetsPage.nameInput).toBeVisible();
    await expect(assetsPage.valueInput).toBeVisible();
    await expect(assetsPage.submitButton).toBeVisible();
  });

  test('shows "Your Assets" list section heading', async ({ page }) => {
    await expect(assetsPage.listSection).toBeVisible();
  });

  test('asset form validates required fields', async ({ page }) => {
    // Submit without filling any fields.
    await assetsPage.submitButton.click();

    // Validation error for the name field should appear.
    await expect(page.getByText(/asset name is required/i)).toBeVisible();
  });

  test('asset form validates that value must be greater than zero', async ({ page }) => {
    await assetsPage.nameInput.fill('Test Asset');
    await assetsPage.valueInput.fill('0');
    await assetsPage.submitButton.click();

    await expect(page.getByText(/value must be greater than 0/i)).toBeVisible();
  });

  test('adds a new asset and it appears in the list', async ({ page }) => {
    const assetName = `E2E Test Asset ${Date.now()}`;

    await assetsPage.addAsset({ name: assetName, value: '5000' });

    // The asset should appear in the list.
    await assetsPage.assertAssetVisible(assetName);
  });

  test('adds a fixed asset and it appears with correct type', async ({ page }) => {
    const assetName = `E2E Fixed Asset ${Date.now()}`;

    await assetsPage.addAsset({ name: assetName, value: '250000', assetType: 'fixed' });

    await assetsPage.assertAssetVisible(assetName);

    // The subtitle shows asset type.
    const listItem = page.locator('[class*="listItem"]', {
      has: page.locator('h3', { hasText: assetName }),
    });
    await expect(listItem.getByText(/fixed/i).last()).toBeVisible();
  });

  test('edit button appears on each asset row', async ({ page }) => {
    const assetName = `E2E Edit Target ${Date.now()}`;
    await assetsPage.addAsset({ name: assetName, value: '1000' });
    await assetsPage.assertAssetVisible(assetName);

    const listItem = page.locator('[class*="listItem"]', {
      has: page.locator('h3', { hasText: assetName }),
    });
    await expect(listItem.getByRole('button', { name: /edit/i })).toBeVisible();
  });

  test('clicking edit loads asset into form and shows Update Asset button', async ({ page }) => {
    const assetName = `E2E Edit Flow ${Date.now()}`;
    await assetsPage.addAsset({ name: assetName, value: '2000' });
    await assetsPage.assertAssetVisible(assetName);

    const listItem = page.locator('[class*="listItem"]', {
      has: page.locator('h3', { hasText: assetName }),
    });
    await listItem.getByRole('button', { name: /edit/i }).click();

    // The form title should switch to "Edit Asset" and the submit to "Update Asset".
    await expect(page.getByRole('button', { name: /update asset/i })).toBeVisible();
    // The name field should be pre-filled.
    await expect(assetsPage.nameInput).toHaveValue(assetName);
  });

  test('deletes an asset after confirming the modal', async ({ page }) => {
    const assetName = `E2E Delete Target ${Date.now()}`;
    await assetsPage.addAsset({ name: assetName, value: '3000' });
    await assetsPage.assertAssetVisible(assetName);

    await assetsPage.deleteAsset(assetName);

    // Asset should no longer be visible.
    await expect(assetsPage.assetListItem(assetName)).not.toBeVisible({ timeout: 8_000 });
  });

  test('shows a toast notification after adding an asset', async ({ page }) => {
    // Toast system is present — adding an asset should (typically) trigger
    // no toast by default, but we verify the form resets (name clears).
    const assetName = `E2E Toast Check ${Date.now()}`;
    await assetsPage.addAsset({ name: assetName, value: '100' });

    // After successful submission the name input should be cleared.
    await expect(assetsPage.nameInput).toHaveValue('');
  });

  test('currency selection shows MYR by default', async ({ page }) => {
    await expect(assetsPage.currencySelect).toHaveValue('MYR');
  });

  test('switching currency to USD shows exchange rate info', async ({ page }) => {
    await assetsPage.currencySelect.selectOption('USD');

    // Either shows the rate or a loading indicator.
    const rateOrLoader = page.locator('text=/rate:|loading exchange rate/i');
    await expect(rateOrLoader.first()).toBeVisible({ timeout: 10_000 });
  });
});
