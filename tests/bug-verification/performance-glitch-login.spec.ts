/**
 * performance-glitch-login.spec.ts
 *
 * BUG-004: performance_glitch_user — Intentional Login Delay
 *
 * Bug Description:
 *   performance_glitch_user experiences an intentional ~2-second (2000ms)
 *   delay during the login process. This is an intentional behavior of this
 *   user persona, not a real bug — but it must be tested/measured.
 *
 *   The delay is injected server-side (or via network throttling) to simulate
 *   a real-world slow network condition for a specific user.
 *
 * Expected Behavior:
 *   - Login eventually succeeds (no error)
 *   - Login time >= 2000ms (the intentional delay)
 *   - Threshold: Login should complete within 5000ms (catch regression if delay becomes too long)
 *   - After login, all functionality works normally
 *
 * AC:
 *   AC-001: Login with performance_glitch_user eventually succeeds
 *   AC-002: Login time is at least 2000ms (captures the intentional delay)
 *   AC-003: Login completes within 5000ms threshold (no regression)
 *   AC-004: After slow login, inventory page loads and functions normally
 *   AC-005: Performance metrics are captured and attached to test report
 */

import { expect, test } from '../../fixtures/traced-steps';
import { CartPage } from '../../pages/CartPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import { SAUCE_DEMO_USERS } from '../../test-data/supported-users';

const { performance_glitch_user } = SAUCE_DEMO_USERS;

/** Maximum acceptable login time in ms (5s) — fail if exceeded (regression) */
const PERFORMANCE_THRESHOLD_MS = 5000;
/** Minimum expected delay in ms (2000ms) — login should be at least this slow */
const EXPECTED_MIN_DELAY_MS = 2000;

test.describe('BUG-004: performance_glitch_user — Login Performance Delay', () => {
  let loginPage: LoginPage;
  let inventoryPage: InventoryPage;
  let cartPage: CartPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inventoryPage = new InventoryPage(page);
    cartPage = new CartPage(page);
  });

  test.afterEach(async ({ page }) => {
    if (await inventoryPage.isOnInventoryPage()) {
      await inventoryPage.logout();
    }
  });

  /**
   * TC-BUG-004-01: performance_glitch_user login eventually succeeds (AC-001)
   */
  test('TC-BUG-004-01: performance_glitch_user can login successfully @bug @p0', async ({
    page,
  }) => {
    const start = Date.now();
    await loginPage.navigate();
    await loginPage.login(performance_glitch_user.username, performance_glitch_user.password);
    const loginTime = Date.now() - start;

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.inventoryItems.first()).toBeVisible();
    console.log(`[BUG-004] Login succeeded in ${loginTime}ms`);
  });

  /**
   * TC-BUG-004-02: Login time is at least 2000ms — intentional delay captured (AC-002)
   *
   * BUG VERIFICATION:
   *   PASSES if login time >= 2000ms (delay is present)
   *   FAILS  if login time < 2000ms (delay removed or user persona changed)
   *
   * This documents the intentional slowness. A test failure means the delay
   * behavior was changed, which may break tests that depend on it.
   */
  test('TC-BUG-004-02: Login takes at least 2000ms (intentional delay present) @bug @p2', async ({
    page,
  }) => {
    const start = Date.now();
    await loginPage.navigate();
    await loginPage.login(performance_glitch_user.username, performance_glitch_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    const loginTime = Date.now() - start;

    console.log(
      `[BUG-004] Total login time: ${loginTime}ms (expected min: ${EXPECTED_MIN_DELAY_MS}ms)`
    );
    console.log(
      `[BUG-004] Intentional delay captured: ${loginTime >= EXPECTED_MIN_DELAY_MS ? 'YES' : 'NO'}`
    );

    // This will PASS if delay is present, FAIL if delay was removed
    expect(
      loginTime,
      `BUG-004: Login should take at least ${EXPECTED_MIN_DELAY_MS}ms (intentional delay)`
    ).toBeGreaterThanOrEqual(EXPECTED_MIN_DELAY_MS);
  });

  /**
   * TC-BUG-004-03: Login completes within 5000ms threshold (AC-003)
   *
   * This is the regression guard. If login takes > 5000ms, something is wrong
   * beyond the intentional 2s delay (e.g., network is too slow or server is down).
   */
  test('TC-BUG-004-03: Login completes within 5000ms threshold (no regression) @bug @p2', async ({
    page,
  }) => {
    const start = Date.now();
    await loginPage.navigate();
    await loginPage.login(performance_glitch_user.username, performance_glitch_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    const loginTime = Date.now() - start;

    console.log(`[BUG-004] Login time: ${loginTime}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)`);

    expect(
      loginTime,
      `Login should complete within ${PERFORMANCE_THRESHOLD_MS}ms threshold`
    ).toBeLessThanOrEqual(PERFORMANCE_THRESHOLD_MS);
  });

  /**
   * TC-BUG-004-04: Inventory page works normally after slow login (AC-004)
   *
   * Verify the slow login doesn't break any subsequent functionality.
   */
  test('TC-BUG-004-04: Inventory and cart work correctly after slow login @bug @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(performance_glitch_user.username, performance_glitch_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Count products
    const productNames = await inventoryPage.getAllProductNames();
    expect(productNames.length).toBe(6);
    console.log(`[BUG-004] Inventory shows ${productNames.length} products after slow login`);

    // Add item to cart
    await inventoryPage.addItemToCart(productNames[0]);
    const badge = await inventoryPage.getCartBadgeCount();
    expect(badge).toBe(1);

    // Navigate to cart
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    const cartItems = await cartPage.getCartItemCount();
    expect(cartItems).toBe(1);
    console.log(`[BUG-004] Cart works correctly after slow login`);
  });

  /**
   * TC-BUG-004-05: Performance metrics captured for BUG-004 report (AC-005)
   *
   * Measures multiple timing metrics and attaches them to the test report.
   */
  test('TC-BUG-004-05: Capture performance metrics for BUG-004 @bug @p2', async ({
    page,
  }, testInfo) => {
    const timings: Record<string, number> = {};

    // Measure: Navigate to login page
    const navStart = Date.now();
    await loginPage.navigate();
    await page.waitForLoadState('domcontentloaded');
    timings.navigationMs = Date.now() - navStart;

    // Measure: Fill credentials
    const fillStart = Date.now();
    await loginPage.usernameInput.fill(performance_glitch_user.username);
    await loginPage.passwordInput.fill(performance_glitch_user.password);
    timings.fillCredentialsMs = Date.now() - fillStart;

    // Measure: Click login and wait for redirect
    const loginStart = Date.now();
    await loginPage.loginButton.click();
    await page.waitForURL(/inventory\.html/, { timeout: 10000 });
    timings.loginClickToRedirectMs = Date.now() - loginStart;

    // Measure: Full login (navigate + credentials + redirect)
    const totalLoginStart = navStart; // already captured above
    const totalLoginTime = Date.now() - navStart;

    // Get Performance API metrics
    const perfMetrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation');
      if (entries.length === 0) return null;
      const nav = entries[0] as PerformanceNavigationTiming;
      const base = nav.startTime || 0;
      return {
        domContentLoadedMs: nav.domContentLoadedEventEnd - base,
        loadCompleteMs: nav.loadEventEnd - base,
        domInteractiveMs: nav.domInteractive - base,
      };
    });

    const bugData = {
      bugId: 'BUG-004',
      user: performance_glitch_user.username,
      description: 'Intentional 2-second (2000ms) login delay for performance_glitch_user',
      timings: {
        navigationMs: timings.navigationMs,
        fillCredentialsMs: timings.fillCredentialsMs,
        loginClickToRedirectMs: timings.loginClickToRedirectMs,
        totalLoginMs: totalLoginTime,
      },
      performanceApi: perfMetrics,
      threshold: {
        maxAcceptableMs: PERFORMANCE_THRESHOLD_MS,
        minExpectedMs: EXPECTED_MIN_DELAY_MS,
        passesThreshold: totalLoginTime <= PERFORMANCE_THRESHOLD_MS,
        passesDelayCheck: timings.loginClickToRedirectMs >= EXPECTED_MIN_DELAY_MS,
      },
      analysis: {
        delayPresent: timings.loginClickToRedirectMs >= EXPECTED_MIN_DELAY_MS,
        delayMs: timings.loginClickToRedirectMs,
        isRegression: totalLoginTime > PERFORMANCE_THRESHOLD_MS,
      },
    };

    console.log('[BUG-004] Performance Report:', JSON.stringify(bugData, null, 2));

    await testInfo.attach('BUG-004-performance-metrics', {
      contentType: 'application/json',
      body: JSON.stringify(bugData, null, 2),
    });
    await testInfo.attach('BUG-004-post-login-page', {
      contentType: 'image/png',
      body: await page.screenshot({ fullPage: false }),
    });

    // Assert delay is present (2000ms+)
    expect(
      timings.loginClickToRedirectMs,
      `BUG-004: Login redirect should take at least ${EXPECTED_MIN_DELAY_MS}ms (intentional delay)`
    ).toBeGreaterThanOrEqual(EXPECTED_MIN_DELAY_MS);
  });

  /**
   * TC-BUG-004-06: Compare performance_glitch_user vs standard_user login time
   *
   * standard_user should be fast (< 1000ms typically).
   * performance_glitch_user should be slow (>= 2000ms).
   * This test documents the difference.
   */
  test('TC-BUG-004-06: Compare login time vs standard_user baseline @bug @p0', async ({ page }) => {
    // Measure standard_user login
    const standardUserLoginPage = new LoginPage(page);
    await standardUserLoginPage.navigate();
    const standardStart = Date.now();
    await standardUserLoginPage.login('standard_user', 'secret_sauce');
    await page.waitForURL(/inventory\.html/);
    const standardLoginTime = Date.now() - standardStart;

    // Logout
    await inventoryPage.logout();
    await page.waitForURL(/\/$/);

    // Measure performance_glitch_user login
    const perfStart = Date.now();
    await standardUserLoginPage.navigate();
    await standardUserLoginPage.login(
      performance_glitch_user.username,
      performance_glitch_user.password
    );
    await page.waitForURL(/inventory\.html/);
    const perfLoginTime = Date.now() - perfStart;

    const slowdownFactor = perfLoginTime / standardLoginTime;

    console.log(`[BUG-004] standard_user login:        ${standardLoginTime}ms`);
    console.log(`[BUG-004] performance_glitch_user:   ${perfLoginTime}ms`);
    console.log(`[BUG-004] Slowdown factor:           ${slowdownFactor.toFixed(1)}x`);

    // performance_glitch_user should be at least 1.5x slower than standard
    expect(
      slowdownFactor,
      'performance_glitch_user should be noticeably slower than standard_user'
    ).toBeGreaterThanOrEqual(1.5);
  });

  /**
   * TC-BUG-004-07: Multiple login attempts — delay is consistent
   *
   * Verifies the delay is consistently applied across multiple login attempts.
   */
  test('TC-BUG-004-07: Login delay is consistent across multiple attempts @bug @critical @p0', async ({
    page,
  }) => {
    const loginTimes: number[] = [];

    for (let attempt = 1; attempt <= 3; attempt++) {
      // Logout if logged in
      if (await inventoryPage.isOnInventoryPage()) {
        await inventoryPage.logout();
        await page.waitForURL(/\/$/);
      }

      const start = Date.now();
      await loginPage.navigate();
      await loginPage.login(performance_glitch_user.username, performance_glitch_user.password);
      await page.waitForURL(/inventory\.html/);
      const elapsed = Date.now() - start;
      loginTimes.push(elapsed);
      console.log(`[BUG-004] Attempt ${attempt} login time: ${elapsed}ms`);
    }

    const avg = loginTimes.reduce((a, b) => a + b, 0) / loginTimes.length;
    const min = Math.min(...loginTimes);
    const max = Math.max(...loginTimes);
    const variance = max - min;

    console.log(
      `[BUG-004] Login times: ${loginTimes}ms | Avg: ${avg.toFixed(0)}ms | Range: ${min}-${max}ms | Variance: ${variance}ms`
    );

    // All login times should be >= 2000ms (consistent delay)
    for (let i = 0; i < loginTimes.length; i++) {
      expect(
        loginTimes[i],
        `BUG-004: Login attempt ${i + 1} should take at least ${EXPECTED_MIN_DELAY_MS}ms`
      ).toBeGreaterThanOrEqual(EXPECTED_MIN_DELAY_MS);
    }

    // Variance should be reasonable (< 2000ms — no extreme outliers)
    expect(
      variance,
      'Login delay variance should be reasonable (no extreme outliers)'
    ).toBeLessThan(2000);
  });
});
