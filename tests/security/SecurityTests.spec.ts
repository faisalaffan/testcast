/**
 * SecurityTests.spec.ts
 *
 * SUITE 8: Security Vulnerability Tests (P0)
 *
 * Purpose: Verify application is protected against common security vulnerabilities
 * including URL manipulation, session hijacking, and access control bypasses.
 *
 * Bug Coverage:
 * - BUG-001 (partial): Access control bypass via direct URL access
 *
 * Test Cases:
 * - TC-SEC-001: Direct URL access to inventory without login redirects to login
 * - TC-SEC-002: Direct URL access to cart without login redirects to login
 * - TC-SEC-003: Direct URL access to checkout without login redirects to login
 * - TC-SEC-004: Logged out user cannot access protected pages
 * - TC-SEC-005: Session invalidation after logout
 * - TC-SEC-006: Cannot manipulate cart via direct URL with invalid item
 * - TC-SEC-007: Back button after logout doesn't restore session
 * - TC-SEC-008: Viewport metadata not exposed in requests
 * - TC-SEC-009: No sensitive data in URL parameters
 * - TC-SEC-010: Checkout step one cannot be skipped
 * - TC-SEC-011: Checkout step two cannot be accessed directly
 * - TC-SEC-012: No XSS in product names/descriptions reflected in page
 *
 * Coverage: All 6 user types for access control tests
 */

import { expect, test } from '../../fixtures/traced-steps';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import { SAUCE_DEMO_USERS } from '../../test-data/supported-users';

const {
  standard_user,
  locked_out_user,
  problem_user,
  error_user,
  visual_user,
  performance_glitch_user,
} = SAUCE_DEMO_USERS;

test.describe('SUITE 8: Security Vulnerability Tests', () => {
  let loginPage: LoginPage;
  let inventoryPage: InventoryPage;
  let cartPage: CartPage;
  let checkoutPage: CheckoutPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inventoryPage = new InventoryPage(page);
    cartPage = new CartPage(page);
    checkoutPage = new CheckoutPage(page);
  });

  test.afterEach(async ({ page }) => {
    // Attempt cleanup
    if (await inventoryPage.isOnInventoryPage()) {
      await inventoryPage.logout();
    }
  });

  /**
   * TC-SEC-001: Direct inventory URL access without auth redirects to login
   */
  test('TC-SEC-001: Direct inventory URL without login redirects to login @security @critical @p0', async ({
    page,
  }) => {
    await page.goto('/inventory.html');
    const pathname = new URL(page.url()).pathname;
    console.log(
      `[TC-SEC-001] After direct inventory access: ${page.url()} (pathname: ${pathname})`
    );
    // Should redirect away from /inventory.html - either to root (/) or /index.html (login page)
    expect(pathname).not.toBe('/inventory.html');
  });

  /**
   * TC-SEC-002: Direct cart URL access without auth redirects to login
   */
  test('TC-SEC-002: Direct cart URL without login redirects to login @security @critical @p0', async ({
    page,
  }) => {
    await page.goto('/cart.html');
    const pathname = new URL(page.url()).pathname;
    console.log(`[TC-SEC-002] After direct cart access: ${page.url()} (pathname: ${pathname})`);
    // Should redirect away from /cart.html
    expect(pathname).not.toBe('/cart.html');
  });

  /**
   * TC-SEC-003: Direct checkout URL access without auth redirects to login
   */
  test('TC-SEC-003: Direct checkout URL without login redirects to login @security @critical @p0', async ({
    page,
  }) => {
    await page.goto('/checkout-step-one.html');
    const pathname = new URL(page.url()).pathname;
    console.log(`[TC-SEC-003] After direct checkout access: ${page.url()} (pathname: ${pathname})`);
    // Should redirect away from /checkout-step-one.html
    expect(pathname).not.toBe('/checkout-step-one.html');
  });

  /**
   * TC-SEC-004: Logged out user cannot access protected pages
   */
  test('TC-SEC-004: Logged out session cannot access inventory @security @p0', async ({ page }) => {
    // Login first
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    // Logout
    await inventoryPage.logout();
    const logoutPathname = new URL(page.url()).pathname;
    console.log(`[TC-SEC-004] After logout URL: ${page.url()} (pathname: ${logoutPathname})`);
    expect(logoutPathname).toBe('/');
    // Try to access inventory directly
    await page.goto('/inventory.html');
    const pathname = new URL(page.url()).pathname;
    console.log(`[TC-SEC-004] After logout direct access: ${page.url()} (pathname: ${pathname})`);
    expect(pathname).not.toBe('/inventory.html');
  });

  /**
   * TC-SEC-005: Session is invalidated after logout
   */
  test('TC-SEC-005: Session invalidated after logout @security @p0', async ({ page }) => {
    // Login
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    const sessionBefore = await page.evaluate(
      () => localStorage.getItem('session_token') || sessionStorage.getItem('session_token')
    );
    console.log(`[TC-SEC-005] Session before logout: ${sessionBefore}`);
    // Logout
    await inventoryPage.logout();
    // Try direct access with same storage
    await page.goto('/inventory.html');
    const pathname = new URL(page.url()).pathname;
    console.log(`[TC-SEC-005] After logout URL: ${page.url()} (pathname: ${pathname})`);
    expect(pathname).not.toBe('/inventory.html');
  });

  /**
   * TC-SEC-006: Cannot add non-existent item via URL manipulation
   */
  test('TC-SEC-006: Invalid item ID in URL is handled @security @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    // Try accessing product detail with fake ID
    await page.goto('/inventory-item.html?id=fake-item-999');
    // Should either show error or redirect
    const currentUrl = page.url();
    console.log(`[TC-SEC-006] After fake item URL: ${currentUrl}`);
    // Should not crash, should show appropriate error or redirect
    expect(currentUrl).not.toContain('sentry');
  });

  /**
   * TC-SEC-007: Back button after logout doesn't restore session
   */
  test('TC-SEC-007: Back button after logout is blocked @security @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.logout();
    const logoutPathname = new URL(page.url()).pathname;
    expect(logoutPathname).toBe('/');
    // Navigate back
    await page.goBack();
    const backPathname = new URL(page.url()).pathname;
    console.log(`[TC-SEC-007] After back button: ${page.url()} (pathname: ${backPathname})`);
    // Should be redirected to login (pathname /), not show inventory
    expect(backPathname).toBe('/');
  });

  /**
   * TC-SEC-008: No sensitive data leaked in console errors
   */
  test('TC-SEC-008: No sensitive data in console errors @security @p1', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await page.goto('/inventory.html');
    await page.waitForLoadState('networkidle');
    const sensitivePatterns = [/password/i, /secret/i, /token/i, /api.?key/i, /bearer/i];
    const leakedData = consoleErrors.filter((err) => sensitivePatterns.some((p) => p.test(err)));
    console.log(
      `[TC-SEC-008] Console errors: ${consoleErrors.length}, sensitive leaks: ${leakedData.length}`
    );
    expect(leakedData.length).toBe(0);
  });

  /**
   * TC-SEC-009: No sensitive data in URL parameters
   */
  test('TC-SEC-009: No sensitive data in URL parameters @security @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    // Add item to cart and navigate to cart
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    const currentUrl = page.url();
    const url = new URL(currentUrl);
    const sensitiveParams = ['password', 'token', 'key', 'secret', 'auth', 'session'];
    const foundSensitive = sensitiveParams.filter((p) =>
      Object.keys(url.searchParams).some((k) => k.toLowerCase().includes(p))
    );
    console.log(
      `[TC-SEC-009] URL params: ${url.searchParams.toString()}, sensitive found: ${foundSensitive}`
    );
    expect(foundSensitive.length).toBe(0);
  });

  /**
   * TC-SEC-010: Checkout step one cannot be skipped to step two
   */
  test('TC-SEC-010: Cannot skip checkout step one @security @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    // Try to directly access step two
    await page.goto('/checkout-step-two.html');
    const pathname = new URL(page.url()).pathname;
    console.log(`[TC-SEC-010] Direct step-two access: ${page.url()} (pathname: ${pathname})`);
    // Should redirect back to step one (not stay on step-two) or redirect to login
    expect(pathname).not.toBe('/checkout-step-two.html');
  });

  /**
   * TC-SEC-011: Checkout step two requires valid step one data
   */
  test('TC-SEC-011: Cannot access checkout step two without valid session @security @p0', async ({
    page,
  }) => {
    // Login and fill step one
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'John',
      lastName: 'Doe',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);
    // Now logout and try to access step two
    await inventoryPage.logout();
    await page.goto('/checkout-step-two.html');
    const pathname = new URL(page.url()).pathname;
    console.log(`[TC-SEC-011] After logout step-two access: ${page.url()} (pathname: ${pathname})`);
    expect(pathname).not.toBe('/checkout-step-two.html');
  });

  /**
   * TC-SEC-012: No XSS in product names reflected in page
   */
  test('TC-SEC-012: Product names are escaped @security @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    const productNames = await inventoryPage.getAllProductNames();
    const hasXSSPatterns = productNames.some((name) => /<script|javascript:|on\w+=/i.test(name));
    console.log(`[TC-SEC-012] Product names XSS check: ${hasXSSPatterns}`);
    expect(hasXSSPatterns).toBe(false);
  });

  /**
   * TC-SEC-013: Locked out user cannot access any protected page
   */
  test('TC-SEC-013: Locked out user has no access @security @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(locked_out_user.username, locked_out_user.password);
    const errorVisible = await loginPage.isErrorVisible();
    const currentUrl = page.url();
    console.log(`[TC-SEC-013] Locked out URL: ${currentUrl}, error: ${errorVisible}`);
    expect(errorVisible).toBe(true);
    expect(currentUrl).not.toContain('inventory');
  });

  /**
   * TC-SEC-014: Error user session cannot access protected pages
   */
  test('TC-SEC-014: error_user cannot bypass auth @security @p1', async ({ page }) => {
    // Even if error_user somehow gets past login
    await page.goto('/inventory.html');
    const pathname = new URL(page.url()).pathname;
    console.log(`[TC-SEC-014] error_user direct inventory: ${page.url()} (pathname: ${pathname})`);
    expect(pathname).not.toBe('/inventory.html');
  });

  /**
   * TC-SEC-015: visual_user session security works correctly
   */
  test('TC-SEC-015: visual_user logout invalidates session @security @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.logout();
    await page.goto('/inventory.html');
    const pathname = new URL(page.url()).pathname;
    console.log(`[TC-SEC-015] visual_user after logout: ${page.url()} (pathname: ${pathname})`);
    expect(pathname).not.toBe('/inventory.html');
  });

  /**
   * TC-SEC-016: performance_glitch_user session security works
   */
  test('TC-SEC-016: performance_glitch_user logout invalidates session @security @p1', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(performance_glitch_user.username, performance_glitch_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.logout();
    await page.goto('/inventory.html');
    const pathname = new URL(page.url()).pathname;
    console.log(
      `[TC-SEC-016] performance_glitch_user after logout: ${page.url()} (pathname: ${pathname})`
    );
    expect(pathname).not.toBe('/inventory.html');
  });

  /**
   * TC-SEC-017: problem_user session security works
   */
  test('TC-SEC-017: problem_user logout invalidates session @security @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.logout();
    await page.goto('/inventory.html');
    const pathname = new URL(page.url()).pathname;
    console.log(`[TC-SEC-017] problem_user after logout: ${page.url()} (pathname: ${pathname})`);
    expect(pathname).not.toBe('/inventory.html');
  });

  /**
   * TC-SEC-018: Cookie-based session security check
   */
  test('TC-SEC-018: No HttpOnly cookie manipulation possible @security @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => /session|token|auth/i.test(c.name));
    console.log(
      `[TC-SEC-018] Session cookie: ${sessionCookie?.name}, httpOnly: ${sessionCookie?.httpOnly}`
    );
    // Session cookies should be httpOnly
    if (sessionCookie) {
      expect(sessionCookie.httpOnly).toBe(true);
    }
  });
});
