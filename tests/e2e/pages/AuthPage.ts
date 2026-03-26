import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object Model for the AuthPage (login screen).
 *
 * The app uses Google OAuth via Supabase — there is no username/password form.
 * This POM covers the unauthenticated landing view only.
 */
export class AuthPagePOM {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  /** The main "Continue with Google" CTA button. */
  get googleSignInButton() {
    return this.page.getByRole('button', { name: /continue with google/i });
  }

  /** The application title shown on the auth card. */
  get appTitle() {
    return this.page.getByRole('heading', { name: /financial tracker/i });
  }

  /** Subtitle / tagline beneath the title. */
  get subtitle() {
    return this.page.getByText(/sign in to securely access/i);
  }

  /** Error message element (shown when OAuth call fails). */
  get errorMessage() {
    return this.page.locator('text=/failed to sign in|error/i');
  }

  async assertLoginPageVisible() {
    await expect(this.appTitle).toBeVisible();
    await expect(this.googleSignInButton).toBeVisible();
    await expect(this.googleSignInButton).toBeEnabled();
  }
}
