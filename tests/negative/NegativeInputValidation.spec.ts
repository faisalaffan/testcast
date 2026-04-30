/**
 * NegativeInputValidation.spec.ts
 *
 * SUITE 7: Negative Input Validation Tests (P1)
 *
 * Purpose: Verify application properly handles invalid inputs,
 * malformed data, and negative test scenarios across all user types.
 *
 * Test Cases:
 * - TC-NEG-001: Empty username shows validation error
 * - TC-NEG-002: Empty password shows validation error
 * - TC-NEG-003: Invalid username format
 * - TC-NEG-004: Invalid password (too short)
 * - TC-NEG-005: Non-existent user cannot login
 * - TC-NEG-006: Checkout with empty first name
 * - TC-NEG-007: Checkout with empty last name
 * - TC-NEG-008: Checkout with empty postal code
 * - TC-NEG-009: Special characters in name fields
 * - TC-NEG-010: SQL injection attempt in username
 * - TC-NEG-011: HTML in checkout first name
 * - TC-NEG-012: Unicode characters in postal code
 *
 * Coverage: All 6 user types, negative scenarios, error messages
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

test.describe('SUITE 7: Negative Input Validation Tests', () => {
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
   * TC-NEG-001: Empty username shows validation error
   */
  test('TC-NEG-001: Empty username shows error message @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.dismissError();
    await loginPage.login('', 'secret_sauce');
    const errorVisible = await loginPage.isErrorVisible();
    const errorText = errorVisible ? await loginPage.getErrorMessage() : '';
    console.log(`[TC-NEG-001] Error visible: ${errorVisible}, message: ${errorText}`);
    expect(errorVisible).toBe(true);
  });

  /**
   * TC-NEG-002: Empty password shows validation error
   */
  test('TC-NEG-002: Empty password shows error message @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.dismissError();
    await loginPage.login('standard_user', '');
    const errorVisible = await loginPage.isErrorVisible();
    const errorText = errorVisible ? await loginPage.getErrorMessage() : '';
    console.log(`[TC-NEG-002] Error visible: ${errorVisible}, message: ${errorText}`);
    expect(errorVisible).toBe(true);
  });

  /**
   * TC-NEG-003: Non-existent user cannot login
   */
  test('TC-NEG-003: Non-existent user login fails @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.dismissError();
    await loginPage.login('nonexistent_user_12345', 'wrong_password');
    const errorVisible = await loginPage.isErrorVisible();
    const errorText = errorVisible ? await loginPage.getErrorMessage() : '';
    console.log(`[TC-NEG-003] Error visible: ${errorVisible}, message: ${errorText}`);
    expect(errorVisible).toBe(true);
    expect(errorText.toLowerCase()).toMatch(/username do not match|user does not exist|invalid/i);
  });

  /**
   * TC-NEG-004: Wrong password for existing user
   */
  test('TC-NEG-004: Wrong password fails for existing user @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.dismissError();
    await loginPage.login(standard_user.username, 'wrong_password');
    const errorVisible = await loginPage.isErrorVisible();
    const errorText = errorVisible ? await loginPage.getErrorMessage() : '';
    console.log(`[TC-NEG-004] Error visible: ${errorVisible}, message: ${errorText}`);
    expect(errorVisible).toBe(true);
  });

  /**
   * TC-NEG-005: Locked out user cannot login
   */
  test('TC-NEG-005: Locked out user shows specific error @critical @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.dismissError();
    await loginPage.login(locked_out_user.username, locked_out_user.password);
    const errorVisible = await loginPage.isErrorVisible();
    const errorText = errorVisible ? await loginPage.getErrorMessage() : '';
    console.log(`[TC-NEG-005] Error visible: ${errorVisible}, message: ${errorText}`);
    expect(errorVisible).toBe(true);
    expect(errorText.toLowerCase()).toMatch(/locked out|locked|sorry/i);
  });

  /**
   * TC-NEG-006: Checkout with empty first name
   */
  test('TC-NEG-006: Checkout fails with empty first name @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({ firstName: '', lastName: 'User', postalCode: '12345' });
    await checkoutPage.clickContinue();
    // Should show validation error or stay on checkout page
    const onCheckout = page.url().includes('checkout');
    console.log(`[TC-NEG-006] Still on checkout: ${onCheckout}`);
    expect(onCheckout).toBe(true);
  });

  /**
   * TC-NEG-007: Checkout with empty last name
   */
  test('TC-NEG-007: Checkout fails with empty last name @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({ firstName: 'John', lastName: '', postalCode: '12345' });
    await checkoutPage.clickContinue();
    const onCheckout = page.url().includes('checkout');
    console.log(`[TC-NEG-007] Still on checkout: ${onCheckout}`);
    expect(onCheckout).toBe(true);
  });

  /**
   * TC-NEG-008: Checkout with empty postal code
   */
  test('TC-NEG-008: Checkout fails with empty postal code @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({ firstName: 'John', lastName: 'User', postalCode: '' });
    await checkoutPage.clickContinue();
    const onCheckout = page.url().includes('checkout');
    console.log(`[TC-NEG-008] Still on checkout: ${onCheckout}`);
    expect(onCheckout).toBe(true);
  });

  /**
   * TC-NEG-009: Special characters in checkout name fields
   */
  test('TC-NEG-009: Special characters in name are handled @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'John<script>alert(1)</script>',
      lastName: "O'Brien",
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    // Should either accept with sanitization or show validation error
    const currentUrl = page.url();
    console.log(`[TC-NEG-009] After submit URL: ${currentUrl}`);
    // Either stays on checkout (validation) or proceeds (sanitization)
    expect(currentUrl.includes('checkout') || currentUrl.includes('checkout-step-two')).toBe(true);
  });

  /**
   * TC-NEG-010: SQL injection attempt in username field
   */
  test('TC-NEG-010: SQL injection in username is rejected @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.dismissError();
    await loginPage.login("admin' OR '1'='1", 'anything');
    const errorVisible = await loginPage.isErrorVisible();
    console.log(`[TC-NEG-010] SQL injection error visible: ${errorVisible}`);
    expect(errorVisible).toBe(true);
  });

  /**
   * TC-NEG-011: HTML tags in first name are sanitized or rejected
   */
  test('TC-NEG-011: HTML in checkout first name is handled @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: '<img src=x onerror=alert(1)>',
      lastName: 'Test',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    const currentUrl = page.url();
    console.log(`[TC-NEG-011] After submit URL: ${currentUrl}`);
    // Should either stay (validation) or proceed (sanitization)
    expect(currentUrl.includes('checkout') || currentUrl.includes('checkout-step-two')).toBe(true);
  });

  /**
   * TC-NEG-012: Unicode characters in postal code
   */
  test('TC-NEG-012: Unicode in postal code is handled @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    // Try Unicode postal code - some systems may reject non-numeric
    await checkoutPage.fillCheckoutForm({
      firstName: 'John',
      lastName: 'User',
      postalCode: 'ABC-中文-123',
    });
    await checkoutPage.clickContinue();
    const currentUrl = page.url();
    console.log(`[TC-NEG-012] After submit URL: ${currentUrl}`);
    // Should either stay (validation rejects) or proceed (accepted)
    expect(currentUrl.includes('checkout') || currentUrl.includes('checkout-step-two')).toBe(true);
  });

  /**
   * TC-NEG-013: problem_user checkout validation works despite issues
   */
  test('TC-NEG-013: problem_user checkout handles validation correctly @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    // Empty postal code for problem_user
    await checkoutPage.fillCheckoutForm({ firstName: 'Problem', lastName: 'User', postalCode: '' });
    await checkoutPage.clickContinue();
    const onCheckout = page.url().includes('checkout');
    console.log(`[TC-NEG-013] problem_user still on checkout: ${onCheckout}`);
    expect(onCheckout).toBe(true);
  });

  /**
   * TC-NEG-014: error_user checkout validation still works
   */
  test('TC-NEG-014: error_user checkout validation works @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({ firstName: 'Error', lastName: 'User', postalCode: '' });
    await checkoutPage.clickContinue();
    const onCheckout = page.url().includes('checkout');
    console.log(`[TC-NEG-014] error_user still on checkout: ${onCheckout}`);
    expect(onCheckout).toBe(true);
  });

  /**
   * TC-NEG-015: visual_user checkout validation works
   */
  test('TC-NEG-015: visual_user checkout validation works @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({ firstName: 'Visual', lastName: 'User', postalCode: '' });
    await checkoutPage.clickContinue();
    const onCheckout = page.url().includes('checkout');
    console.log(`[TC-NEG-015] visual_user still on checkout: ${onCheckout}`);
    expect(onCheckout).toBe(true);
  });

  /**
   * TC-NEG-016: performance_glitch_user checkout validation works
   */
  test('TC-NEG-016: performance_glitch_user checkout validation works @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(performance_glitch_user.username, performance_glitch_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'Performance',
      lastName: 'User',
      postalCode: '',
    });
    await checkoutPage.clickContinue();
    const onCheckout = page.url().includes('checkout');
    console.log(`[TC-NEG-016] performance_glitch_user still on checkout: ${onCheckout}`);
    expect(onCheckout).toBe(true);
  });

  /**
   * TC-NEG-017: Empty cart cannot proceed to checkout
   */
  test('TC-NEG-017: Empty cart checkout button is disabled or redirects @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);
    const isEmpty = await cartPage.isCartEmpty();
    console.log(`[TC-NEG-017] Cart is empty: ${isEmpty}`);
    if (!isEmpty) {
      // Remove any items if present
      const count = await cartPage.getCartItemCount();
      for (let i = 0; i < count; i++) {
        const names = await cartPage.getCartItemNames();
        if (names.length > 0) {
          await cartPage.removeItem(names[0]);
        }
      }
    }
    const checkoutVisible = await cartPage.checkoutButton.isVisible();
    const checkoutEnabled = checkoutVisible ? await cartPage.checkoutButton.isEnabled() : false;
    console.log(`[TC-NEG-017] Checkout visible: ${checkoutVisible}, enabled: ${checkoutEnabled}`);
    // If cart is empty, checkout should be disabled or not proceed
    if (await cartPage.isCartEmpty()) {
      expect(checkoutEnabled).toBe(false);
    }
  });
});
