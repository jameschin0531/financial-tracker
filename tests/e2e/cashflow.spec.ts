import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';
import { CashFlowPagePOM } from './pages/CashFlowPagePOM';

/**
 * Cash Flow page tests — add income, add expense, verify table display.
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

test.describe('Cash Flow page', () => {
  let appPage: AppPage;
  let cashFlow: CashFlowPagePOM;

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTokens,
      'Skipped — set E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY, E2E_ACCESS_TOKEN, E2E_REFRESH_TOKEN, E2E_USER_ID, E2E_USER_EMAIL to run authenticated tests',
    );

    appPage = new AppPage(page);
    cashFlow = new CashFlowPagePOM(page);

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
    await appPage.navigateTo('cashflow');

    await expect(page.getByRole('heading', { name: /monthly cash flow/i, level: 1 })).toBeVisible();
  });

  test('cash flow page renders the income and expense forms', async ({ page }) => {
    await expect(cashFlow.incomeSourceInput).toBeVisible();
    await expect(cashFlow.incomeAmountInput).toBeVisible();
    await expect(cashFlow.addIncomeButton).toBeVisible();

    await expect(cashFlow.expenseCategorySelect).toBeVisible();
    await expect(cashFlow.expenseAmountInput).toBeVisible();
    await expect(cashFlow.addExpenseButton).toBeVisible();
  });

  test('cash flow table shows INCOME / EXPENSE / BALANCE summary rows', async ({ page }) => {
    await cashFlow.assertTableSummaryVisible();
  });

  test('income form validates required fields', async ({ page }) => {
    await cashFlow.addIncomeButton.click();
    await expect(page.getByText(/income source is required/i)).toBeVisible();
  });

  test('income form validates amount must be greater than zero', async ({ page }) => {
    await cashFlow.incomeSourceInput.fill('Test Income');
    await cashFlow.incomeAmountInput.fill('0');
    await cashFlow.addIncomeButton.click();
    await expect(page.getByText(/amount must be greater than 0/i)).toBeVisible();
  });

  test('expense form validates amount must be greater than zero', async ({ page }) => {
    await cashFlow.expenseAmountInput.fill('0');
    await cashFlow.addExpenseButton.click();
    await expect(page.getByText(/amount must be greater than 0/i)).toBeVisible();
  });

  test('adds income and it appears in the cash flow table', async ({ page }) => {
    const source = `E2E Salary ${Date.now()}`;

    await cashFlow.addIncome({ source, amount: '5000' });

    await cashFlow.assertIncomeRowVisible(source);
  });

  test('adds expense and it appears in the cash flow table', async ({ page }) => {
    // The expense category defaults to the first available category.
    // We verify the row appears by looking for the category name in a cell.
    const firstCategory = await cashFlow.expenseCategorySelect.inputValue();
    const description = `E2E expense note ${Date.now()}`;

    await cashFlow.addExpense({ amount: '200', description });

    // The description appears in the Remark column.
    await cashFlow.assertExpenseRowVisible(description);
    // The category (item) column should also show.
    if (firstCategory) {
      await cashFlow.assertExpenseRowVisible(firstCategory);
    }
  });

  test('income form resets after successful submission', async ({ page }) => {
    await cashFlow.addIncome({ source: `E2E Reset Check ${Date.now()}`, amount: '1000' });
    // After submit the source input clears.
    await expect(cashFlow.incomeSourceInput).toHaveValue('');
  });

  test('expense form resets after successful submission', async ({ page }) => {
    await cashFlow.addExpense({ amount: '100', description: 'reset test' });
    await expect(cashFlow.expenseAmountInput).toHaveValue('');
  });

  test('income frequency select defaults to Monthly', async ({ page }) => {
    await expect(cashFlow.incomeFrequencySelect).toHaveValue('monthly');
  });

  test('deletes an income entry via the table row delete button', async ({ page }) => {
    const source = `E2E Delete Income ${Date.now()}`;
    await cashFlow.addIncome({ source, amount: '3000' });
    await cashFlow.assertIncomeRowVisible(source);

    // Click Delete in the row.
    const row = page.locator('tr', { hasText: source });
    await row.getByRole('button', { name: /delete/i }).click();

    // ConfirmModal "Delete" button.
    await page.getByRole('button', { name: 'Delete' }).last().click();

    await expect(page.locator('tr', { hasText: source })).not.toBeVisible({ timeout: 8_000 });
  });

  test('edit button in income row pre-fills the income form', async ({ page }) => {
    const source = `E2E Edit Income ${Date.now()}`;
    await cashFlow.addIncome({ source, amount: '4500' });
    await cashFlow.assertIncomeRowVisible(source);

    const row = page.locator('tr', { hasText: source });
    await row.getByRole('button', { name: /edit/i }).click();

    // The form section heading changes to "Edit Income" (h2 section title).
    await expect(page.getByRole('heading', { name: /edit income/i, level: 2 })).toBeVisible();
    // The source input is pre-filled.
    await expect(cashFlow.incomeSourceInput).toHaveValue(source);
  });
});
