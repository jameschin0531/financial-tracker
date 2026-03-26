import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object Model for the main authenticated application shell.
 *
 * Covers the persistent Layout (sidebar + header) and page-level navigation.
 *
 * Session injection:
 *   Call `AppPage.injectSession(page, tokens)` inside `page.addInitScript` or
 *   `beforeEach` to seed the Supabase localStorage session so the app considers
 *   the user authenticated without going through Google OAuth.
 */

export interface SupabaseSessionTokens {
  supabaseUrl: string;
  accessToken: string;
  refreshToken: string;
  userId: string;
  userEmail: string;
  anonKey: string;
}

export class AppPage {
  constructor(private readonly page: Page) {}

  // ---------------------------------------------------------------------------
  // Session helpers
  // ---------------------------------------------------------------------------

  /**
   * Injects a real Supabase auth session into localStorage so the React app
   * treats the user as signed in. Must be called before navigation.
   *
   * Supabase stores the session under the key:
   *   `sb-<project-ref>-auth-token`
   * where <project-ref> is the hostname segment of the Supabase URL.
   *
   * We also mock the /api/config response so the app receives the correct
   * Supabase credentials at startup.
   */
  async injectSession(tokens: SupabaseSessionTokens) {
    // Derive the project ref from the Supabase URL (e.g. "abcdef" from
    // "https://abcdef.supabase.co").
    const urlObj = new URL(tokens.supabaseUrl);
    const projectRef = urlObj.hostname.split('.')[0];
    const storageKey = `sb-${projectRef}-auth-token`;

    const sessionPayload = JSON.stringify({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id: tokens.userId,
        aud: 'authenticated',
        role: 'authenticated',
        email: tokens.userEmail,
        app_metadata: { provider: 'google', providers: ['google'] },
        user_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    // Intercept /api/config so Supabase is initialised with the correct keys.
    await this.page.route('/api/config', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          supabaseUrl: tokens.supabaseUrl,
          supabaseAnonKey: tokens.anonKey,
        }),
      }),
    );

    // Seed localStorage before the page JS runs.
    await this.page.addInitScript(
      ({ key, value, visibilityKey }: { key: string; value: string; visibilityKey: string }) => {
        localStorage.setItem(key, value);
        // Default to amounts visible in tests so currency values are readable.
        if (!localStorage.getItem(visibilityKey)) {
          localStorage.setItem(visibilityKey, 'false');
        }
      },
      { key: storageKey, value: sessionPayload, visibilityKey: 'financialAppHideAmounts' },
    );
  }

  async goto() {
    await this.page.goto('/');
  }

  // ---------------------------------------------------------------------------
  // Header elements
  // ---------------------------------------------------------------------------

  get header() {
    return this.page.locator('header');
  }

  get toggleMenuButton() {
    return this.page.getByRole('button', { name: /toggle menu/i });
  }

  get signOutButton() {
    return this.page.getByRole('button', { name: /sign out/i });
  }

  get visibilityToggle() {
    return this.page.getByRole('button', {
      name: /hide all amounts|show all amounts/i,
    });
  }

  // ---------------------------------------------------------------------------
  // Sidebar navigation
  // ---------------------------------------------------------------------------

  get sidebar() {
    return this.page.locator('aside');
  }

  navButton(label: string) {
    return this.page.getByRole('button', { name: label, exact: false });
  }

  async navigateTo(page: 'dashboard' | 'assets' | 'liabilities' | 'cashflow' | 'stocks' | 'crypto') {
    const labelMap: Record<string, string> = {
      dashboard: 'Dashboard',
      assets: 'Assets',
      liabilities: 'Liabilities',
      cashflow: 'Monthly Cash Flow',
      stocks: 'Stock Tracker',
      crypto: 'Crypto Tracker',
    };
    await this.navButton(labelMap[page]).click();
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  get loadingSpinner() {
    return this.page.getByText(/syncing dashboard/i);
  }

  async waitForAppReady() {
    // Wait until the loading screen disappears and the main layout appears.
    await expect(this.loadingSpinner).not.toBeVisible({ timeout: 15_000 });
    await expect(this.sidebar).toBeVisible({ timeout: 10_000 });
  }

  // ---------------------------------------------------------------------------
  // Page heading helpers
  // ---------------------------------------------------------------------------

  async assertCurrentPage(heading: string) {
    await expect(
      this.page.getByRole('heading', { name: heading, level: 1 }),
    ).toBeVisible();
  }

  // ---------------------------------------------------------------------------
  // Sign-out
  // ---------------------------------------------------------------------------

  async signOut() {
    // Intercept the Supabase sign-out request so it always succeeds in tests.
    await this.page.route('**/auth/v1/logout**', (route) =>
      route.fulfill({ status: 204, body: '' }),
    );
    await this.signOutButton.click();
    // After sign-out the app should show the auth page.
    await expect(
      this.page.getByRole('heading', { name: /financial tracker/i }),
    ).toBeVisible({ timeout: 15_000 });
  }
}
