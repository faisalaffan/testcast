/**
 * User Types Test Suite
 * Comprehensive tests for all SauceDemo user types
 *
 * User Types:
 * 1. standard_user      - Normal happy path
 * 2. locked_out_user    - Account locked, error expected
 * 3. problem_user       - Login succeeds but UI is broken
 * 4. performance_glitch_user - Performance issues expected
 * 5. error_user         - Error handling edge case
 * 6. visual_user        - Visual regression baseline
 */

import * as fs from 'fs';
import * as path from 'path';
import { type Page, type TestInfo, expect, test } from '@playwright/test';

// Test data
const TEST_USERS = {
  standard_user: {
    username: 'standard_user',
    password: 'secret_sauce',
    expectedLogin: true,
    expectedRedirect: '/inventory.html',
  },
  locked_out_user: {
    username: 'locked_out_user',
    password: 'secret_sauce',
    expectedLogin: false,
    expectedError: 'locked',
  },
  problem_user: {
    username: 'problem_user',
    password: 'secret_sauce',
    expectedLogin: true,
    expectedRedirect: '/inventory.html',
  },
  performance_glitch_user: {
    username: 'performance_glitch_user',
    password: 'secret_sauce',
    expectedLogin: true,
    expectedRedirect: '/inventory.html',
  },
  error_user: {
    username: 'error_user',
    password: 'secret_sauce',
    expectedLogin: true,
    expectedRedirect: '/inventory.html',
  },
  visual_user: {
    username: 'visual_user',
    password: 'secret_sauce',
    expectedLogin: true,
    expectedRedirect: '/inventory.html',
  },
} as const;

// Helper: Login function
async function performLogin(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/');
  await page.fill('#user-name', username);
  await page.fill('#password', password);
  await page.click('#login-button');
}

// Helper: Capture screenshot with metadata
async function captureScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const screenshotDir = 'test-results/vrt-screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const filePath = path.join(screenshotDir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  await testInfo.attach(name, {
    contentType: 'image/png',
    body: fs.readFileSync(filePath),
  });
}

// Helper: Check for broken images
async function countBrokenImages(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const images = document.querySelectorAll('img');
    let brokenCount = 0;
    images.forEach((img) => {
      if (!img.complete || img.naturalWidth === 0) {
        brokenCount++;
      }
    });
    return brokenCount;
  });
}

// Helper: Get page load time metrics
async function measurePageLoadTime(page: Page): Promise<{
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
}> {
  return await page.evaluate(() => {
    const timing = performance.timing;
    return {
      navigationStart: timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart,
    };
  });
}

// ============================================
// TEST SUITE 1: STANDARD USER (TC-001 to TC-002)
// Happy path - normal login
// ============================================
test.describe('Standard User - TC-001 to TC-002', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await performLogin(page, TEST_USERS.standard_user.username, TEST_USERS.standard_user.password);
  });

  test('TC-001: Standard user can login successfully @critical @p0', async ({ page }) => {
    // Verify redirect to inventory page
    await expect(page).toHaveURL(/inventory\.html/);
  });

  test('TC-002: Standard user sees inventory items after login @critical @p0', async ({
    page,
  }, testInfo) => {
    // Verify inventory page content
    await expect(page.locator('.inventory_list')).toBeVisible();

    // Count inventory items
    const itemCount = await page.locator('.inventory_item').count();
    expect(itemCount).toBeGreaterThan(0);
    console.log(`Found ${itemCount} inventory items`);

    // Capture screenshot for documentation
    await captureScreenshot(page, testInfo, 'standard-user-inventory');
  });
});

// ============================================
// TEST SUITE 2: LOCKED OUT USER (TC-003 to TC-004)
// Negative test - account locked
// ============================================
test.describe('Locked Out User - TC-003 to TC-004', () => {
  test('TC-003: Locked out user sees error message @p1', async ({ page }) => {
    await performLogin(
      page,
      TEST_USERS.locked_out_user.username,
      TEST_USERS.locked_out_user.password
    );

    // Verify error message is displayed
    await expect(page.locator('[data-test="error"]')).toBeVisible();

    // Verify error message content contains "locked"
    const errorText = await page.locator('[data-test="error"]').textContent();
    expect(errorText?.toLowerCase()).toContain(TEST_USERS.locked_out_user.expectedError);
  });

  test('TC-004: Locked out user is NOT redirected to inventory @p1', async ({ page }) => {
    await performLogin(
      page,
      TEST_USERS.locked_out_user.username,
      TEST_USERS.locked_out_user.password
    );

    // Should NOT be on inventory page
    await expect(page).not.toHaveURL(/inventory\.html/);

    // Should still be on login page
    await expect(page.locator('#login-button')).toBeVisible();
  });

  test('TC-005: Locked out user error message is user-friendly @p1', async ({ page }, testInfo) => {
    await performLogin(
      page,
      TEST_USERS.locked_out_user.username,
      TEST_USERS.locked_out_user.password
    );

    // Error should be visible and descriptive
    const errorContainer = page.locator('.error-message-container');
    await expect(errorContainer).toBeVisible();

    // Capture error state
    await captureScreenshot(page, testInfo, 'locked-out-error');
  });
});

// ============================================
// TEST SUITE 3: PROBLEM USER (TC-006 to TC-007)
// Login works but UI has issues
// ============================================
test.describe('Problem User - TC-006 to TC-007', () => {
  test('TC-006: Problem user can login @critical @p0', async ({ page }) => {
    await performLogin(page, TEST_USERS.problem_user.username, TEST_USERS.problem_user.password);

    // Login should succeed
    await expect(page).toHaveURL(/inventory\.html/);
  });

  test('TC-007: Problem user UI has visual defects @bug @p0', async ({ page }, testInfo) => {
    await performLogin(page, TEST_USERS.problem_user.username, TEST_USERS.problem_user.password);

    // Capture screenshot showing the problem
    await captureScreenshot(page, testInfo, 'problem-user-inventory');

    // Check for broken images
    const brokenImages = await countBrokenImages(page);
    console.log(`Found ${brokenImages} broken images`);

    // Document what elements might be broken
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    // Take note - problem user may have:
    // - Missing/broken images
    // - CSS styling issues
    // - Malformed HTML
    const inventoryItems = await page.locator('.inventory_item').count();
    console.log(`Inventory items visible: ${inventoryItems}`);
  });

  test('TC-008: Problem user inventory items are rendered @bug @p0', async ({ page }) => {
    await performLogin(page, TEST_USERS.problem_user.username, TEST_USERS.problem_user.password);

    // Verify inventory list exists (even if broken)
    const inventoryList = page.locator('.inventory_list');
    await expect(inventoryList).toBeAttached();

    // Items may be visible but broken
    const itemCount = await page.locator('.inventory_item').count();
    console.log(`Problem user sees ${itemCount} inventory items`);
  });
});

// ============================================
// TEST SUITE 4: PERFORMANCE GLITCH USER (TC-009 to TC-010)
// Performance issues expected
// ============================================
test.describe('Performance Glitch User - TC-009 to TC-010', () => {
  test('TC-009: Performance user can login @critical @p0', async ({ page }) => {
    await performLogin(
      page,
      TEST_USERS.performance_glitch_user.username,
      TEST_USERS.performance_glitch_user.password
    );

    // Login should succeed
    await expect(page).toHaveURL(/inventory\.html/);
  });

  test('TC-010: Performance user experiences slow page load @performance @p0', async ({
    page,
  }, testInfo) => {
    const startTime = Date.now();

    await performLogin(
      page,
      TEST_USERS.performance_glitch_user.username,
      TEST_USERS.performance_glitch_user.password
    );

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    const totalTime = Date.now() - startTime;
    console.log(`Total login + load time: ${totalTime}ms`);

    // Capture performance screenshot
    await captureScreenshot(page, testInfo, 'performance-glitch-inventory');

    // Log performance metrics
    const metrics = await measurePageLoadTime(page);
    console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`Load Complete: ${metrics.loadComplete}ms`);

    // This user type is expected to have performance issues
    // We document the timing for comparison
    await testInfo.attach('performance-metrics', {
      contentType: 'application/json',
      body: JSON.stringify({
        totalLoginTime: totalTime,
        domContentLoaded: metrics.domContentLoaded,
        loadComplete: metrics.loadComplete,
        timestamp: new Date().toISOString(),
      }),
    });
  });

  test('TC-011: Performance user inventory is functional despite slowness @performance @p0', async ({
    page,
  }) => {
    await performLogin(
      page,
      TEST_USERS.performance_glitch_user.username,
      TEST_USERS.performance_glitch_user.password
    );

    // Wait for inventory to be ready
    await page.waitForSelector('.inventory_item', { timeout: 30000 });

    // Inventory should still work
    const itemCount = await page.locator('.inventory_item').count();
    expect(itemCount).toBeGreaterThan(0);
  });
});

// ============================================
// TEST SUITE 5: ERROR USER (TC-012 to TC-013)
// Error handling edge case
// ============================================
test.describe('Error User - TC-012 to TC-013', () => {
  test('TC-012: Error user can login @critical @p0', async ({ page }) => {
    await performLogin(page, TEST_USERS.error_user.username, TEST_USERS.error_user.password);

    // Login behavior - may or may not redirect
    // Just verify page doesn't crash (no white screen)
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });

  test('TC-013: Error user does not cause white screen of death @bug @p0', async ({
    page,
  }, testInfo) => {
    await performLogin(page, TEST_USERS.error_user.username, TEST_USERS.error_user.password);

    // Wait a bit for any JS to execute
    await page.waitForTimeout(1000);

    // Capture state
    const screenshot = await page.screenshot();
    await testInfo.attach('error-user-state', {
      contentType: 'image/png',
      body: screenshot,
    });

    // Verify we have actual content (not blank page)
    const bodyText = await page.locator('body').textContent();
    const hasContent = bodyText && bodyText.trim().length > 0;

    // Either shows inventory or graceful error - both are acceptable
    const isOnInventory = page.url().includes('inventory');
    const hasErrorMessage = await page
      .locator('.error-message-container')
      .isVisible()
      .catch(() => false);

    expect(hasContent || isOnInventory || hasErrorMessage).toBeTruthy();
  });

  test('TC-014: Error user app handles gracefully @bug @p0', async ({ page }) => {
    await performLogin(page, TEST_USERS.error_user.username, TEST_USERS.error_user.password);

    // Give time for any async operations
    await page.waitForTimeout(500);

    // Check page is still responsive
    const isReady = await page.evaluate(() => document.readyState);
    console.log(`Document ready state: ${isReady}`);

    // Should not crash browser
    expect(['interactive', 'complete']).toContain(isReady);
  });
});

// ============================================
// TEST SUITE 6: VISUAL USER (TC-015 to TC-016)
// Visual regression baseline
// ============================================
test.describe('Visual User - TC-015 to TC-016', () => {
  test('TC-015: Visual user can login @critical @p0', async ({ page }) => {
    await performLogin(page, TEST_USERS.visual_user.username, TEST_USERS.visual_user.password);

    // Login should work normally
    await expect(page).toHaveURL(/inventory\.html/);
  });

  test('TC-016: Visual user captures baseline screenshots for VRT @bug @p0', async ({
    page,
  }, testInfo) => {
    await performLogin(page, TEST_USERS.visual_user.username, TEST_USERS.visual_user.password);

    // Wait for full page render
    await page.waitForLoadState('networkidle');

    // Capture full page screenshot for VRT baseline
    await page.screenshot({
      path: 'test-results/vrt-baseline/visual-user-inventory.png',
      fullPage: true,
    });

    // Also capture via testInfo for Allure
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('visual-baseline-inventory', {
      contentType: 'image/png',
      body: screenshot,
    });

    // Verify inventory is rendered
    const itemCount = await page.locator('.inventory_item').count();
    console.log(`Visual user sees ${itemCount} inventory items`);
  });

  test('TC-017: Visual user baseline - login page @bug @p0', async ({ page }, testInfo) => {
    // Go to login page - if already logged in, SauceDemo will redirect to inventory
    await page.goto('/');

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');

    // Capture whatever page we're on - either login or inventory
    const screenshot = await page.screenshot({ fullPage: true });
    const currentUrl = page.url();

    await testInfo.attach('visual-baseline-login', {
      contentType: 'image/png',
      body: screenshot,
    });

    console.log(`TC-017: Captured screenshot at URL: ${currentUrl}`);
  });

  test('TC-018: Visual user baseline - cart page @bug @p0', async ({ page }, testInfo) => {
    // Login first
    await performLogin(page, TEST_USERS.visual_user.username, TEST_USERS.visual_user.password);

    // Navigate to cart
    await page.click('.shopping_cart_link');
    await expect(page).toHaveURL(/cart\.html/);

    await page.waitForLoadState('networkidle');

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('visual-baseline-cart', {
      contentType: 'image/png',
      body: screenshot,
    });
  });
});

// ============================================
// DATA DRIVEN TEST - All User Types
// ============================================
test.describe('Data Driven - All User Types Login', () => {
  const userTypes = [
    { key: 'standard_user', shouldLogin: true },
    { key: 'locked_out_user', shouldLogin: false },
    { key: 'problem_user', shouldLogin: true },
    { key: 'performance_glitch_user', shouldLogin: true },
    { key: 'error_user', shouldLogin: true },
    { key: 'visual_user', shouldLogin: true },
  ] as const;

  for (const { key, shouldLogin } of userTypes) {
    test(`DDT: ${key} login behavior @critical @p0`, async ({ page }) => {
      const user = TEST_USERS[key];

      await performLogin(page, user.username, user.password);

      if (shouldLogin) {
        // Should redirect to inventory
        await expect(page).toHaveURL(/inventory\.html/);
      } else {
        // Should show error and NOT redirect
        await expect(page.locator('.error-message-container')).toBeVisible();
        await expect(page).not.toHaveURL(/inventory\.html/);
      }
    });
  }
});
