import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object Model for the Assets page.
 *
 * Form field IDs are taken directly from AssetForm.tsx:
 *   #asset-name, #asset-type, #asset-category, #asset-currency,
 *   #asset-value, #asset-date
 */
export class AssetsPagePOM {
  constructor(private readonly page: Page) {}

  // ---------------------------------------------------------------------------
  // Form fields
  // ---------------------------------------------------------------------------

  get nameInput() {
    return this.page.locator('#asset-name');
  }

  get typeSelect() {
    return this.page.locator('#asset-type');
  }

  get categorySelect() {
    return this.page.locator('#asset-category');
  }

  get currencySelect() {
    return this.page.locator('#asset-currency');
  }

  get valueInput() {
    return this.page.locator('#asset-value');
  }

  get dateInput() {
    return this.page.locator('#asset-date');
  }

  get submitButton() {
    return this.page.getByRole('button', { name: /add asset/i });
  }

  // ---------------------------------------------------------------------------
  // List section
  // ---------------------------------------------------------------------------

  get listSection() {
    return this.page.locator('h2', { hasText: /your assets/i });
  }

  get emptyState() {
    return this.page.getByText(/no assets yet/i);
  }

  assetListItem(name: string) {
    return this.page.locator('h3', { hasText: name });
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Fills and submits the Add Asset form with the given values.
   * The category must already exist in the select list (or be the default).
   */
  async addAsset({
    name,
    value,
    assetType = 'current',
  }: {
    name: string;
    value: string;
    assetType?: 'current' | 'fixed';
  }) {
    await this.nameInput.fill(name);
    await this.typeSelect.selectOption(assetType);
    await this.valueInput.fill(value);
    await this.submitButton.click();
  }

  async assertAssetVisible(name: string) {
    await expect(this.assetListItem(name)).toBeVisible({ timeout: 8_000 });
  }

  async assertAssetCount(count: number) {
    await expect(
      this.page.getByRole('heading', {
        name: new RegExp(`your assets \\(${count}\\)`, 'i'),
      }),
    ).toBeVisible();
  }

  // ---------------------------------------------------------------------------
  // Delete flow (uses ConfirmModal)
  // ---------------------------------------------------------------------------

  async deleteAsset(name: string) {
    const item = this.page.locator('[class*="listItem"]', {
      has: this.page.locator('h3', { hasText: name }),
    });
    await item.getByRole('button', { name: /delete/i }).click();

    // ConfirmModal appears — click the confirm button.
    await this.page
      .getByRole('button', { name: /confirm|yes|delete/i })
      .last()
      .click();
  }
}
