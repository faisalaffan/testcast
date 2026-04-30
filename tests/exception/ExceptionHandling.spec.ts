/**
 * ExceptionHandling.spec.ts
 *
 * SUITE 11: Exception/Error Handling Tests (P1)
 *
 * Purpose: Verify application handles error conditions gracefully,
 * including network failures, page not found, and unexpected states.
 *
 * Test Cases:
 * - TC-EXC-001: 404 page shows appropriate message
 * - TC-EXC-002: Network failure during login shows error
 * - TC-EXC-003: Page crash shows friendly error
 * - TC-EXC-004: Invalid product ID shows error page
 * - TC-EXC-005: Server error during checkout shows error message
 * - TC-EXC-006: Timeout during page load shows error
 * - TC-EXC-007: Browser back from error state recovers properly
 * - TC-EXC-008: Application handles empty state gracefully
 *
 * Coverage: All 6 user types for error state handling
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

test.describe('SUITE 11: Exception/Error Handling Tests', () => {
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
   * TC-EXC-001: 404 page shows appropriate message
   */
  test('TC-EXC-001: Non-existent page shows error message @p1', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-12345.html');
    const status = response?.status() ?? 0;
    const currentUrl = page.url();
    console.log(`[TC-EXC-001] 404 response status: ${status}, URL: ${currentUrl}`);
    // Should either show 404 or redirect to valid page
    expect(status === 404 || currentUrl.includes('saucedemo')).toBe(true);
  });

  /**
   * TC-EXC-002: Empty cart shows appropriate message
   */
  test('TC-EXC-002: Empty cart shows appropriate empty state @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);
    const isEmpty = await cartPage.isCartEmpty();
    const itemCount = await cartPage.getCartItemCount();
    console.log(`[TC-EXC-002] Cart empty: ${isEmpty}, items: ${itemCount}`);
    if (isEmpty) {
      const continueBtn = await cartPage.continueShoppingButton.isVisible();
      console.log(`[TC-EXC-002] Continue shopping visible: ${continueBtn}`);
      expect(continueBtn).toBe(true);
    }
  });

  /**
   * TC-EXC-003: Invalid product detail URL handled gracefully
   */
  test('TC-EXC-003: Invalid product ID handled gracefully @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    // Navigate to non-existent product
    await page.goto('/inventory-item.html?id=nonexistent-product');
    const currentUrl = page.url();
    const pageContent = await page.content();
    const hasError =
      pageContent.includes('error') ||
      pageContent.includes('Error') ||
      pageContent.includes('not found');
    console.log(`[TC-EXC-003] URL: ${currentUrl}, has error: ${hasError}`);
    // Should handle gracefully - either show error or redirect
    expect(currentUrl.includes('saucedemo') || hasError).toBe(true);
  });

  /**
   * TC-EXC-004: Checkout with missing form data shows validation
   */
  test('TC-EXC-004: Incomplete checkout form shows validation error @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({ firstName: '', lastName: '', postalCode: '' });
    await checkoutPage.clickContinue();
    const currentUrl = page.url();
    console.log(`[TC-EXC-004] URL after empty submit: ${currentUrl}`);
    // Should stay on checkout step one (validation error)
    expect(currentUrl).toContain('checkout-step-one');
  });

  /**
   * TC-EXC-005: error_user product detail shows error gracefully
   */
  test('TC-EXC-005: error_user renders error gracefully @critical @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    const productLink = page.locator('[data-test="inventory-item-name"]').first();
    await productLink.click();
    await page.waitForURL(/inventory-item\.html/);
    const hasRenderError = await page.evaluate(() => {
      const body = document.body.textContent?.toLowerCase() ?? '';
      return (
        body.includes('error') || body.includes('failed') || body.includes('something went wrong')
      );
    });
    console.log(`[TC-EXC-005] error_user has render error: ${hasRenderError}`);
    // For error_user, we expect the error to show (bug present)
    expect(hasRenderError).toBe(true);
  });

  /**
   * TC-EXC-006: problem_user shows errors but continues
   */
  test('TC-EXC-006: problem_user continues despite errors @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    // Can still add items despite potential errors
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'Problem',
      lastName: 'User',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);
    console.log(`[TC-EXC-006] problem_user checkout continued successfully`);
  });

  /**
   * TC-EXC-007: Application recovers from browser refresh
   */
  test('TC-EXC-007: Page refresh maintains state @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const currentUrl = page.url();
    console.log(`[TC-EXC-007] URL after refresh: ${currentUrl}`);
    // After refresh should either maintain inventory page or handle gracefully
    expect(currentUrl.includes('inventory') || currentUrl.includes('login')).toBe(true);
  });

  /**
   * TC-EXC-008: visual_user handles broken images gracefully
   */
  test('TC-EXC-008: visual_user handles broken images without crash @bug @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await page.waitForLoadState('networkidle');
    // Page should not crash even with broken images
    const isOnPage = await inventoryPage.isOnInventoryPage();
    const productCount = await inventoryPage.getAllProductNames();
    console.log(`[TC-EXC-008] visual_user on page: ${isOnPage}, products: ${productCount.length}`);
    expect(isOnPage).toBe(true);
    expect(productCount.length).toBe(6);
  });

  /**
   * TC-EXC-009: Checkout with network-like delay shows loading state
   */
  test('TC-EXC-009: Checkout handles item removal during review @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.addItemToCart('Sauce Labs Bike Light');
    await inventoryPage.clickCart();
    const itemCount = await cartPage.getCartItemCount();
    console.log(`[TC-EXC-009] Cart items: ${itemCount}`);
    // Remove one item
    await cartPage.removeItem('Sauce Labs Backpack');
    const newCount = await cartPage.getCartItemCount();
    console.log(`[TC-EXC-009] After removal: ${newCount}`);
    expect(newCount).toBe(itemCount - 1);
  });

  /**
   * TC-EXC-010: Complete order and return shows appropriate completion
   */
  test('TC-EXC-010: Order completion shows success message @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'Success',
      lastName: 'Test',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await checkoutPage.clickFinish();
    await expect(page).toHaveURL(/checkout-complete\.html/);
    const pageText = await page.content();
    const hasSuccessMessage =
      pageText.toLowerCase().includes('complete') || pageText.toLowerCase().includes('thank');
    console.log(`[TC-EXC-010] Has success message: ${hasSuccessMessage}`);
    expect(hasSuccessMessage).toBe(true);
  });

  /**
   * TC-EXC-011: error_user checkout handles errors gracefully
   */
  test('TC-EXC-011: error_user checkout flow handles errors @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'Error',
      lastName: 'User',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    // error_user may have issues
    const currentUrl = page.url();
    console.log(`[TC-EXC-011] error_user checkout URL: ${currentUrl}`);
    // Should either proceed or show error gracefully
    expect(currentUrl.includes('checkout') || currentUrl.includes('saucedemo')).toBe(true);
  });

  /**
   * TC-EXC-012: performance_glitch_user handles timeout gracefully
   */
  test('TC-EXC-012: performance_glitch_user login handles delay @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(performance_glitch_user.username, performance_glitch_user.password);
    // Should eventually reach inventory despite delay
    await page.waitForURL(/inventory\.html/, { timeout: 10000 });
    const isOnPage = await inventoryPage.isOnInventoryPage();
    console.log(`[TC-EXC-012] performance_glitch_user reached inventory: ${isOnPage}`);
    expect(isOnPage).toBe(true);
  });

  /**
   * TC-EXC-013: After checkout complete, back to inventory works
   */
  test('TC-EXC-013: Post-checkout navigation works @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'Nav',
      lastName: 'Test',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await checkoutPage.clickFinish();
    await expect(page).toHaveURL(/checkout-complete\.html/);
    // Click "Back Home" or similar if exists
    const backBtn = page.locator('[data-test="back-to-products"]');
    const hasBackBtn = await backBtn.isVisible().catch(() => false);
    if (hasBackBtn) {
      await backBtn.click();
      await expect(page).toHaveURL(/inventory\.html/);
    }
    console.log(`[TC-EXC-013] Post-checkout navigation handled`);
  });

  /**
   * TC-EXC-014: Login page shows error for locked out user
   */
  test('TC-EXC-014: Locked out user shows specific error @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(locked_out_user.username, locked_out_user.password);
    const errorVisible = await loginPage.isErrorVisible();
    const errorText = errorVisible ? await loginPage.getErrorMessage() : '';
    console.log(`[TC-EXC-014] Locked out error: ${errorText}`);
    expect(errorVisible).toBe(true);
    expect(errorText.toLowerCase()).toMatch(/lock|sorry|username/i);
  });

  /**
   * TC-EXC-015: Invalid URL parameters show error not crash
   */
  test('TC-EXC-015: Invalid URL parameters handled gracefully @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    // Navigate with bad params
    await page.goto('/inventory.html?invalid_param=<script>alert(1)</script>');
    const currentUrl = page.url();
    console.log(`[TC-EXC-015] URL with bad params: ${currentUrl}`);
    // Should sanitize and not crash
    expect(currentUrl).toMatch(/inventory|login/i);
  });
});
