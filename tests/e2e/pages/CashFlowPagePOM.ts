import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object Model for the Monthly Cash Flow page.
 *
 * Form IDs from IncomeForm.tsx:   #income-source, #income-amount,
 *                                  #income-frequency, #income-date
 * Form IDs from ExpenseForm.tsx:  #expense-category, #expense-amount,
 *                                  #expense-date, #expense-description
 */
export class CashFlowPagePOM {
  constructor(private readonly page: Page) {}

  // ---------------------------------------------------------------------------
  // Income form
  // ---------------------------------------------------------------------------

  get incomeSourceInput() {
    return this.page.locator('#income-source');
  }

  get incomeAmountInput() {
    return this.page.locator('#income-amount');
  }

  get incomeFrequencySelect() {
    return this.page.locator('#income-frequency');
  }

  get incomeDateInput() {
    return this.page.locator('#income-date');
  }

  get addIncomeButton() {
    return this.page.getByRole('button', { name: /add income/i });
  }

  // ---------------------------------------------------------------------------
  // Expense form
  // ---------------------------------------------------------------------------

  get expenseCategorySelect() {
    return this.page.locator('#expense-category');
  }

  get expenseAmountInput() {
    return this.page.locator('#expense-amount');
  }

  get expenseDateInput() {
    return this.page.locator('#expense-date');
  }

  get expenseDescriptionInput() {
    return this.page.locator('#expense-description');
  }

  get addExpenseButton() {
    return this.page.getByRole('button', { name: /add expense/i });
  }

  // ---------------------------------------------------------------------------
  // Table
  // ---------------------------------------------------------------------------

  get cashFlowTable() {
    return this.page.getByRole('table');
  }

  tableRowByText(text: string) {
    return this.page.locator('tr', { hasText: text });
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async addIncome({ source, amount }: { source: string; amount: string }) {
    await this.incomeSourceInput.fill(source);
    await this.incomeAmountInput.fill(amount);
    // Frequency defaults to Monthly — no change needed for simple tests.
    await this.addIncomeButton.click();
  }

  async addExpense({ amount, description }: { amount: string; description?: string }) {
    // Category defaults to the first available option.
    await this.expenseAmountInput.fill(amount);
    if (description) {
      await this.expenseDescriptionInput.fill(description);
    }
    await this.addExpenseButton.click();
  }

  async assertIncomeRowVisible(source: string) {
    await expect(this.tableRowByText(source)).toBeVisible({ timeout: 8_000 });
  }

  async assertExpenseRowVisible(category: string) {
    await expect(this.tableRowByText(category).first()).toBeVisible({ timeout: 8_000 });
  }

  async assertTableSummaryVisible() {
    await expect(this.page.getByRole('cell', { name: /INCOME/i })).toBeVisible();
    await expect(this.page.getByRole('cell', { name: /EXPENSE/i })).toBeVisible();
    await expect(this.page.getByRole('cell', { name: /BALANCE/i })).toBeVisible();
  }
}
