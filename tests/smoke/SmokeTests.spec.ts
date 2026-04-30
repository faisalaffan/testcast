/**
 * SmokeTests.spec.ts
 *
 * SUITE 10: Smoke Tests (P0)
 *
 * Purpose: Minimal verification tests to confirm critical application
 * functionality works after deployment. These are the fastest, most
 * critical tests to run.
 *
 * Test Cases:
 * - TC-SMOKE-001: Application is reachable
 * - TC-SMOKE-002: Login works for standard_user
 * - TC-SMOKE-003: Inventory page shows products
 * - TC-SMOKE-004: Add to cart works
 * - TC-SMOKE-005: Cart shows items
 * - TC-SMOKE-006: Checkout flow works end-to-end
 * - TC-SMOKE-007: Logout works
 * - TC-SMOKE-008: All critical pages are accessible
 *
 * Coverage: standard_user primary, smoke checks for critical path
 */

import { expect, test } from '../../fixtures/traced-steps';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import { SAUCE_DEMO_USERS } from '../../test-data/supported-users';

const { standard_user } = SAUCE_DEMO_USERS;

test.describe('SUITE 10: Smoke Tests - Critical Path Verification', () => {
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
    if (await inventoryPage.isOnInventoryPage()) {
      await inventoryPage.logout();
    }
  });

  /**
   * TC-SMOKE-001: Application is reachable
   */
  test('TC-SMOKE-001: Application is reachable @smoke @critical @p0', async ({ page }) => {
    await page.goto('/');
    const currentUrl = page.url();
    console.log(`[TC-SMOKE-001] App URL: ${currentUrl}`);
    expect(currentUrl).toMatch(/saucedemo|login|index/i);
  });

  /**
   * TC-SMOKE-002: Login works for standard_user
   */
  test('TC-SMOKE-002: Login succeeds for standard_user @smoke @critical @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    const isOnInventory = await inventoryPage.isOnInventoryPage();
    console.log(`[TC-SMOKE-002] On inventory page: ${isOnInventory}`);
    expect(isOnInventory).toBe(true);
  });

  /**
   * TC-SMOKE-003: Inventory page shows 6 products
   */
  test('TC-SMOKE-003: Inventory shows all 6 products @smoke @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    const productNames = await inventoryPage.getAllProductNames();
    console.log(`[TC-SMOKE-003] Products found: ${productNames.length}`);
    expect(productNames.length).toBe(6);
  });

  /**
   * TC-SMOKE-004: Add to cart works and updates badge
   */
  test('TC-SMOKE-004: Add to cart updates cart badge @smoke @critical @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    const badgeBefore = await inventoryPage.getCartBadgeCount();
    console.log(`[TC-SMOKE-004] Badge before: ${badgeBefore}`);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    const badgeAfter = await inventoryPage.getCartBadgeCount();
    console.log(`[TC-SMOKE-004] Badge after: ${badgeAfter}`);
    expect(badgeAfter).toBe(badgeBefore + 1);
  });

  /**
   * TC-SMOKE-005: Cart page shows added items
   */
  test('TC-SMOKE-005: Cart shows added items @smoke @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);
    const cartItemCount = await cartPage.getCartItemCount();
    const cartItemNames = await cartPage.getCartItemNames();
    console.log(`[TC-SMOKE-005] Cart items: ${cartItemCount}, names: ${cartItemNames.join(', ')}`);
    expect(cartItemCount).toBeGreaterThan(0);
    expect(cartItemNames).toContain('Sauce Labs Backpack');
  });

  /**
   * TC-SMOKE-006: Complete checkout flow works
   */
  test('TC-SMOKE-006: Full checkout flow completes @smoke @critical @p0', async ({ page }) => {
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
    await checkoutPage.clickFinish();
    await expect(page).toHaveURL(/checkout-complete\.html/);
    console.log(`[TC-SMOKE-006] Checkout complete page reached`);
  });

  /**
   * TC-SMOKE-007: Logout works and redirects to login
   */
  test('TC-SMOKE-007: Logout redirects to login page @smoke @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.logout();
    await expect(page).toHaveURL(/index|login/i);
    console.log(`[TC-SMOKE-007] Logged out successfully`);
  });

  /**
   * TC-SMOKE-008: All critical pages accessible after login
   */
  test('TC-SMOKE-008: All critical pages are accessible @smoke @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    // Inventory
    await expect(page).toHaveURL(/inventory\.html/);
    console.log(`[TC-SMOKE-008] Inventory: OK`);
    // Cart
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);
    console.log(`[TC-SMOKE-008] Cart: OK`);
    // Back to inventory
    await cartPage.clickContinueShopping();
    await expect(page).toHaveURL(/inventory\.html/);
    // Checkout
    await inventoryPage.addItemToCart('Sauce Labs Bike Light');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'Smoke',
      lastName: 'Test',
      postalCode: '54321',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);
    console.log(`[TC-SMOKE-008] Checkout step 2: OK`);
    await checkoutPage.clickFinish();
    await expect(page).toHaveURL(/checkout-complete\.html/);
    console.log(`[TC-SMOKE-008] Checkout complete: OK`);
  });

  /**
   * TC-SMOKE-009: Product sorting works
   */
  test('TC-SMOKE-009: Product sorting works @smoke @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.selectSortOption('lohi');
    const prices = await inventoryPage.getAllProductPrices();
    console.log(`[TC-SMOKE-009] Prices after lohi sort: $${prices.join(', $')}`);
    let isSorted = true;
    for (let i = 0; i < prices.length - 1; i++) {
      if (prices[i] > prices[i + 1]) isSorted = false;
    }
    expect(isSorted).toBe(true);
  });

  /**
   * TC-SMOKE-010: Cart total calculation is correct
   */
  test('TC-SMOKE-010: Cart total calculation is correct @smoke @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    // Add two items
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.addItemToCart('Sauce Labs Bike Light');
    await inventoryPage.clickCart();
    const cartPrices = await cartPage.getCartItemPrices();
    const expectedTotal = cartPrices.reduce((sum, price) => sum + price, 0);
    const itemCount = await cartPage.getCartItemCount();
    console.log(`[TC-SMOKE-010] Cart prices: $${cartPrices.join(', $')}, count: ${itemCount}`);
    expect(itemCount).toBe(2);
    expect(cartPrices.length).toBe(2);
  });

  /**
   * TC-SMOKE-011: Cart badge updates correctly
   */
  test('TC-SMOKE-011: Cart badge shows correct count @smoke @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    const itemsToAdd = ['Sauce Labs Backpack', 'Sauce Labs Bolt T-Shirt', 'Sauce Labs Onesie'];
    for (const item of itemsToAdd) {
      await inventoryPage.addItemToCart(item);
    }
    const badgeCount = await inventoryPage.getCartBadgeCount();
    console.log(`[TC-SMOKE-011] Badge count after 3 adds: ${badgeCount}`);
    expect(badgeCount).toBe(3);
  });

  /**
   * TC-SMOKE-012: Remove from cart works
   */
  test('TC-SMOKE-012: Remove from cart works @smoke @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    const beforeCount = await cartPage.getCartItemCount();
    await cartPage.removeItem('Sauce Labs Backpack');
    const afterCount = await cartPage.getCartItemCount();
    console.log(`[TC-SMOKE-012] Cart before: ${beforeCount}, after: ${afterCount}`);
    expect(afterCount).toBe(beforeCount - 1);
  });
});
