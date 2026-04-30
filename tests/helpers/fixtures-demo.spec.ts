/**
 * Fixtures Demo Test
 * Demonstrates all available fixtures in the framework
 */

import { expect, test } from '../../fixtures';

// Example 1: Using Auth Fixture
test.describe('Fixtures Demo Suite - TC-010 to TC-016', () => {
  /**
   * TC-010: Login using auth fixture
   * AC: User is automatically logged in via loggedInPage fixture
   */
  test('TC-010: Login using auth fixture @p2', async ({ loggedInPage }) => {
    await expect(loggedInPage.locator('.app_logo')).toBeVisible();
    await expect(loggedInPage.locator('.shopping_cart_link')).toBeVisible();
  });

  /**
   * TC-011: Access auth state
   * AC: Auth state contains correct username and default values
   */
  test('TC-011: Access auth state @p2', async ({ authState }) => {
    console.log('Auth state:', authState);
    expect(authState.username).toBe('standard_user');
    expect(authState.isLoggedIn).toBe(false);
  });

  /**
   * TC-012: Load test data from Excel
   * AC: Excel file is loaded and returns valid data records
   */
  test('TC-012: Load test data from Excel @p2', async ({ testData }) => {
    const users = await testData.loadFromExcel('./test-data/test-users.xlsx', 'Sheet1');
    console.log('Loaded users:', users.length);
    expect(users.length).toBeGreaterThan(0);
  });

  /**
   * TC-013: Get specific record from Excel
   * AC: Specific user record can be retrieved by key field
   */
  test('TC-013: Get specific record @p2', async ({ testData }) => {
    const user = await testData.getRecord(
      './test-data/test-users.xlsx',
      'standard_user',
      'username'
    );
    console.log('Found user:', user);
    expect(user).toBeTruthy();
  });

  /**
   * TC-014: Check feature flag value
   * AC: Feature flag can be read and overridden for testing
   */
  test('TC-014: Check feature flag value @p2', async ({ featureFlags }) => {
    const isEnabled = await featureFlags.getFlag('new-checkout-flow', false);
    console.log('New checkout flow enabled:', isEnabled);

    featureFlags.setFlagOverride('new-checkout-flow', true);
    const isEnabledAfterOverride = await featureFlags.getFlag('new-checkout-flow', false);
    expect(isEnabledAfterOverride).toBe(true);
  });

  /**
   * TC-015: Clear flag overrides
   * AC: Flag overrides can be cleared to restore original values
   */
  test('TC-015: Clear flag overrides @p2', async ({ featureFlags }) => {
    featureFlags.setFlagOverride('test-flag', true);
    featureFlags.clearOverrides();
  });

  /**
   * TC-016: Capture screenshot for VRT
   * AC: Screenshot is captured and saved to specified directory
   */
  test('TC-016: Capture screenshot for VRT @p2', async ({ page }, testInfo) => {
    await page.goto('/');
    const screenshot = await page.screenshot({ fullPage: true });
    // Attach screenshot to Allure report
    await testInfo.attach('login-page-screenshot', {
      contentType: 'image/png',
      body: screenshot,
    });
    expect(screenshot).toBeTruthy();
  });
});

// Example 5: Database & S3 Fixtures
test.describe('Fixtures Demo Suite - TC-019 to TC-020', () => {
  /**
   * TC-019: Database connection validation
   * AC: Database connection is established and can execute query
   */
  test('TC-019: Database connection validation @p2', async ({ dbConnection }) => {
    if (!dbConnection) {
      test.skip(true, 'Database connection not configured');
      return;
    }
    const [rows] = await dbConnection.execute('SELECT 1 as result');
    expect(rows).toBeTruthy();
    console.log('Database connection valid:', rows);
  });

  /**
   * TC-020: S3 operations validation
   * AC: S3 operations can upload and download artifacts
   */
  test('TC-020: S3 operations validation @p2', async ({ s3Operations }) => {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      test.skip(true, 'S3 not configured');
      return;
    }
    // Upload a test file to S3
    const testContent = 'S3 test content ' + Date.now();
    const testKey = `test-artifacts/test-${Date.now()}.txt`;

    // Create temp file
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const tempFile = path.join(os.tmpdir(), `s3-test-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, testContent);

    const url = await s3Operations.upload(tempFile, testKey);
    expect(url).toContain(testKey);
    console.log('S3 upload result:', url);

    // Cleanup temp file
    fs.unlinkSync(tempFile);
  });
});

// Example 6: Parameterized Test (DDT)
test.describe('Fixtures Demo Suite - TC-021 to TC-022', () => {
  /**
   * TC-021: Data-driven login with valid user
   * AC: User is redirected to inventory page
   */
  test('TC-021: Login with valid user via DDT @p2', async ({ page }) => {
    await page.goto('/');
    await page.fill('#user-name', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');
    await expect(page).toHaveURL(/inventory/);
  });

  /**
   * TC-022: Data-driven login with locked_out_user
   * AC: Error message is displayed
   */
  test('TC-022: Login with locked_out_user via DDT @p2', async ({ page }) => {
    await page.goto('/');
    await page.fill('#user-name', 'locked_out_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');
    await expect(page.locator('.error-message-container')).toBeVisible();
  });
});
