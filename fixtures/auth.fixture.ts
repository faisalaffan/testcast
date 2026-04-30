import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';

/**
 * Authentication Fixture
 * Auto-logs in before test and optionally logs out after
 */

export interface AuthFixtures {
  loggedInPage: Page;
  authState: {
    username: string;
    password: string;
    isLoggedIn: boolean;
  };
}

const DEFAULT_USER = process.env.TEST_USERNAME || 'standard_user';
const DEFAULT_PASS = process.env.TEST_PASSWORD || 'secret_sauce';

export const authFixture = base.extend<AuthFixtures>({
  // Auto-login page
  loggedInPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto('/');

    // Fill credentials
    await page.fill('#user-name', DEFAULT_USER);
    await page.fill('#password', DEFAULT_PASS);

    // Click login
    await page.click('#login-button');

    // Wait for navigation to inventory
    await page.waitForURL(/\/inventory\.html/, { timeout: 10000 });

    // Pass the page to test
    await use(page);

    // Optional: logout after test (uncomment if needed)
    // await page.click('#logout_sidebar_link');
  },

  // Auth state for debugging
  authState: async (_, use) => {
    const state = {
      username: DEFAULT_USER,
      password: DEFAULT_PASS,
      isLoggedIn: false,
    };
    await use(state);
  },
});

export { expect } from '@playwright/test';
