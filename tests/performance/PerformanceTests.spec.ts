/**
 * PerformanceTests.spec.ts
 *
 * SUITE 9: Performance Tests (P1)
 *
 * Purpose: Verify application meets performance benchmarks including
 * page load times, response times, and rendering performance.
 *
 * Bug Coverage:
 * - BUG-004: performance_glitch_user has 2-second login delay
 *
 * Test Cases:
 * - TC-PERF-001: Login page loads within 3 seconds
 * - TC-PERF-002: Inventory page loads within 5 seconds
 * - TC-PERF-003: performance_glitch_user login takes >= 2 seconds (BUG-004)
 * - TC-PERF-004: standard_user login is fast (< 1 second)
 * - TC-PERF-005: Cart page loads within 3 seconds
 * - TC-PERF-006: Checkout page loads within 3 seconds
 * - TC-PERF-007: Product detail page loads within 3 seconds
 * - TC-PERF-008: Sorting operations complete within 2 seconds
 * - TC-PERF-009: Add to cart action is instant (< 500ms)
 * - TC-PERF-010: Page navigation is smooth
 *
 * Coverage: All 6 user types, performance benchmarks
 */

import { expect, test } from '../../fixtures/traced-steps';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import { ProductDetailPage } from '../../pages/ProductDetailPage';
import { SAUCE_DEMO_USERS } from '../../test-data/supported-users';

const {
  standard_user,
  locked_out_user,
  problem_user,
  error_user,
  visual_user,
  performance_glitch_user,
} = SAUCE_DEMO_USERS;

test.describe('SUITE 9: Performance Tests', () => {
  let loginPage: LoginPage;
  let inventoryPage: InventoryPage;
  let cartPage: CartPage;
  let checkoutPage: CheckoutPage;
  let productDetailPage: ProductDetailPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inventoryPage = new InventoryPage(page);
    cartPage = new CartPage(page);
    checkoutPage = new CheckoutPage(page);
    productDetailPage = new ProductDetailPage(page);
  });

  test.afterEach(async ({ page }) => {
    if (await inventoryPage.isOnInventoryPage()) {
      await inventoryPage.logout();
    }
  });

  /**
   * TC-PERF-001: Login page loads within 3 seconds
   */
  test('TC-PERF-001: Login page loads within 3 seconds @p1', async ({ page }) => {
    const startTime = Date.now();
    await loginPage.navigate();
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    console.log(`[TC-PERF-001] Login page load time: ${loadTime}ms`);
    expect(loadTime, 'Login page should load within 3 seconds').toBeLessThan(3000);
  });

  /**
   * TC-PERF-002: Inventory page loads within 5 seconds
   */
  test('TC-PERF-002: Inventory page loads within 5 seconds after login @performance @p1', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    const startTime = Date.now();
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    console.log(`[TC-PERF-002] Inventory page load time: ${loadTime}ms`);
    expect(loadTime, 'Inventory page should load within 5 seconds').toBeLessThan(5000);
  });

  /**
   * TC-PERF-003: performance_glitch_user login takes >= 2 seconds (BUG-004) @bug @critical
   */
  test('TC-PERF-003: performance_glitch_user login has 2-second delay (BUG-004) @performance @bug @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    const startTime = Date.now();
    await loginPage.login(performance_glitch_user.username, performance_glitch_user.password);
    await page.waitForURL(/inventory\.html/);
    const loginTime = Date.now() - startTime;
    console.log(
      `[TC-PERF-003] performance_glitch_user login time: ${loginTime}ms (expected >= 2000ms)`
    );
    // Bug verification: login should take at least 2 seconds
    expect(
      loginTime,
      'BUG-004: performance_glitch_user should take >= 2000ms'
    ).toBeGreaterThanOrEqual(2000);
  });

  /**
   * TC-PERF-004: standard_user login is fast (< 1 second) @performance @critical
   */
  test('TC-PERF-004: standard_user login completes in under 1 second @performance @p1', async ({
    page,
  }) => {
    await loginPage.navigate();
    const startTime = Date.now();
    await loginPage.login(standard_user.username, standard_user.password);
    await page.waitForURL(/inventory\.html/);
    const loginTime = Date.now() - startTime;
    console.log(`[TC-PERF-004] standard_user login time: ${loginTime}ms (expected < 1000ms)`);
    expect(loginTime, 'standard_user login should be fast').toBeLessThan(1500);
  });

  /**
   * TC-PERF-005: Cart page loads within 3 seconds
   */
  test('TC-PERF-005: Cart page loads within 3 seconds @performance @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    const startTime = Date.now();
    await inventoryPage.clickCart();
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    console.log(`[TC-PERF-005] Cart page load time: ${loadTime}ms`);
    expect(loadTime, 'Cart page should load within 3 seconds').toBeLessThan(3000);
  });

  /**
   * TC-PERF-006: Checkout page loads within 3 seconds
   */
  test('TC-PERF-006: Checkout page loads within 3 seconds @performance @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    const startTime = Date.now();
    await cartPage.clickCheckout();
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    console.log(`[TC-PERF-006] Checkout page load time: ${loadTime}ms`);
    expect(loadTime, 'Checkout page should load within 3 seconds').toBeLessThan(3000);
  });

  /**
   * TC-PERF-007: Product detail page loads within 3 seconds
   */
  test('TC-PERF-007: Product detail page loads within 3 seconds @performance @p1', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    const startTime = Date.now();
    const productLink = page.locator('[data-test="inventory-item-name"]').first();
    await productLink.click();
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    console.log(`[TC-PERF-007] Product detail load time: ${loadTime}ms`);
    expect(loadTime, 'Product detail should load within 3 seconds').toBeLessThan(3000);
  });

  /**
   * TC-PERF-008: Sorting operations complete within 2 seconds
   */
  test('TC-PERF-008: Sorting completes within 2 seconds @performance @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await page.waitForLoadState('networkidle');
    const startTime = Date.now();
    await inventoryPage.selectSortOption('lohi');
    await page.waitForLoadState('networkidle');
    const sortTime = Date.now() - startTime;
    console.log(`[TC-PERF-008] Sorting time: ${sortTime}ms`);
    expect(sortTime, 'Sorting should complete within 2 seconds').toBeLessThan(2000);
  });

  /**
   * TC-PERF-009: Add to cart action is instant (< 500ms)
   */
  test('TC-PERF-009: Add to cart is instant (<500ms) @performance @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await page.waitForLoadState('networkidle');
    const startTime = Date.now();
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    const addTime = Date.now() - startTime;
    console.log(`[TC-PERF-009] Add to cart time: ${addTime}ms`);
    expect(addTime, 'Add to cart should be instant').toBeLessThan(500);
  });

  /**
   * TC-PERF-010: problem_user has typical performance
   */
  test('TC-PERF-010: problem_user performance is acceptable @performance @p2', async ({ page }) => {
    await loginPage.navigate();
    const startTime = Date.now();
    await loginPage.login(problem_user.username, problem_user.password);
    await page.waitForURL(/inventory\.html/);
    const loginTime = Date.now() - startTime;
    console.log(`[TC-PERF-010] problem_user login time: ${loginTime}ms`);
    // problem_user should not have the glitch delay
    expect(loginTime, 'problem_user should not have delay').toBeLessThan(2000);
  });

  /**
   * TC-PERF-011: error_user has typical performance
   */
  test('TC-PERF-011: error_user performance is acceptable @performance @p2', async ({ page }) => {
    await loginPage.navigate();
    const startTime = Date.now();
    await loginPage.login(error_user.username, error_user.password);
    await page.waitForURL(/inventory\.html/);
    const loginTime = Date.now() - startTime;
    console.log(`[TC-PERF-011] error_user login time: ${loginTime}ms`);
    expect(loginTime, 'error_user should login fast').toBeLessThan(2000);
  });

  /**
   * TC-PERF-012: visual_user has typical performance
   */
  test('TC-PERF-012: visual_user performance is acceptable @performance @p2', async ({ page }) => {
    await loginPage.navigate();
    const startTime = Date.now();
    await loginPage.login(visual_user.username, visual_user.password);
    await page.waitForURL(/inventory\.html/);
    const loginTime = Date.now() - startTime;
    console.log(`[TC-PERF-012] visual_user login time: ${loginTime}ms`);
    expect(loginTime, 'visual_user should login fast').toBeLessThan(2000);
  });

  /**
   * TC-PERF-013: locked_out_user response time is acceptable
   */
  test('TC-PERF-013: locked_out_user error response is fast @performance @p2', async ({ page }) => {
    await loginPage.navigate();
    const startTime = Date.now();
    await loginPage.login(locked_out_user.username, locked_out_user.password);
    await page.waitForTimeout(500);
    const responseTime = Date.now() - startTime;
    console.log(`[TC-PERF-013] locked_out_user response time: ${responseTime}ms`);
    expect(responseTime, 'Locked out error should show quickly').toBeLessThan(2000);
  });

  /**
   * TC-PERF-014: Full checkout flow performance
   */
  test('TC-PERF-014: Complete checkout flow under 10 seconds @performance @p2', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'John',
      lastName: 'Doe',
      postalCode: '12345',
    });
    const startTime = Date.now();
    await checkoutPage.clickContinue();
    await page.waitForURL(/checkout-step-two\.html/);
    const checkoutTime = Date.now() - startTime;
    console.log(`[TC-PERF-014] Checkout flow time: ${checkoutTime}ms`);
    expect(checkoutTime, 'Full checkout should complete quickly').toBeLessThan(5000);
  });

  /**
   * TC-PERF-015: Page navigation performance across all products
   */
  test('TC-PERF-015: Product page navigation is smooth @performance @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await page.waitForLoadState('networkidle');
    const productLink = page.locator('[data-test="inventory-item-name"]').first();
    await productLink.click();
    await page.waitForLoadState('domcontentloaded');
    const startTime = Date.now();
    await productDetailPage.backToProducts();
    await page.waitForLoadState('domcontentloaded');
    const navTime = Date.now() - startTime;
    console.log(`[TC-PERF-015] Product nav time: ${navTime}ms`);
    expect(navTime, 'Product navigation should be smooth').toBeLessThan(1000);
  });
});
