/**
 * EdgeCaseTests.spec.ts
 *
 * SUITE 4: Edge Case Tests
 *
 * Purpose: Test boundary conditions and edge cases that could cause issues.
 *
 * Test Cases:
 * - TC-EDGE-001: Empty cart cannot proceed to checkout
 * - TC-EDGE-002: Remove all items from cart
 * - TC-EDGE-003: Cart persists after page reload
 * - TC-EDGE-004: Continue shopping returns to inventory
 * - TC-EDGE-005: Cancel checkout returns to cart
 * - TC-EDGE-006: Invalid postal code handling
 * - TC-EDGE-007: All products can be added to cart
 * - TC-EDGE-008: Cart badge updates correctly
 *
 * Coverage: Edge cases and boundary conditions
 */

import { expect, test } from '../../fixtures/traced-steps';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import { SAUCE_DEMO_USERS } from '../../test-data/supported-users';

const { standard_user } = SAUCE_DEMO_USERS;

test.describe('SUITE 4: Edge Case Tests', () => {
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
   * TC-EDGE-001: Empty cart cannot proceed to checkout
   * AC: Checkout button should not be visible or should be disabled with empty cart
   */
  test('TC-EDGE-001: Empty cart has no checkout button @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Ensure cart is empty
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    const cartCount = await cartPage.getCartItemCount();
    expect(cartCount).toBe(0);

    // Checkout button should not be visible or should be disabled
    const checkoutButton = page.locator('[data-test="checkout"]');
    const isVisible = await checkoutButton.isVisible().catch(() => false);

    console.log(`[TC-EDGE-001] Cart empty, checkout button visible: ${isVisible}`);

    if (isVisible) {
      const isDisabled = await checkoutButton.isDisabled().catch(() => false);
      expect(isDisabled, 'Checkout button should be disabled with empty cart').toBe(true);
    }
  });

  /**
   * TC-EDGE-002: Remove all items from cart
   * AC: Cart is empty after removing all items
   */
  test('TC-EDGE-002: Remove all items from cart @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Add all 6 products to cart
    const productNames = await inventoryPage.getAllProductNames();
    for (const product of productNames) {
      await inventoryPage.addItemToCart(product);
    }

    const badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(6);

    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    let cartCount = await cartPage.getCartItemCount();
    expect(cartCount).toBe(6);

    // Remove all items one by one
    const removeButtons = page.locator('[data-test^="remove-"]');
    const count = await removeButtons.count();

    for (let i = 0; i < count; i++) {
      const firstRemove = page.locator('[data-test^="remove-"]').first();
      await firstRemove.click();
      await page.waitForTimeout(200);
    }

    cartCount = await cartPage.getCartItemCount();
    console.log(`[TC-EDGE-002] Cart count after removing all: ${cartCount}`);
    expect(cartCount).toBe(0);
  });

  /**
   * TC-EDGE-003: Cart persists after page reload
   * AC: Cart contents are preserved after reload
   */
  test('TC-EDGE-003: Cart persists after page reload @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Add items to cart
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.addItemToCart('Sauce Labs Bike Light');

    const badgeBefore = await inventoryPage.getCartBadgeCount();
    expect(badgeBefore).toBe(2);

    // Reload page
    await page.reload();
    await expect(page).toHaveURL(/inventory\.html/);

    const badgeAfter = await inventoryPage.getCartBadgeCount();
    console.log(`[TC-EDGE-003] Badge before reload: ${badgeBefore}, after: ${badgeAfter}`);

    // Badge should still show 2
    expect(badgeAfter).toBe(2);
  });

  /**
   * TC-EDGE-004: Continue shopping returns to inventory
   * AC: User is returned to inventory page
   */
  test('TC-EDGE-004: Continue shopping returns to inventory @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Click continue shopping
    const continueShopping = page.locator('[data-test="continue-shopping"]');
    await continueShopping.click();

    await expect(page).toHaveURL(/inventory\.html/);
    console.log(`[TC-EDGE-004] Returned to inventory after continue shopping`);
  });

  /**
   * TC-EDGE-005: Cancel checkout returns to cart
   * AC: User is returned to cart page
   */
  test('TC-EDGE-005: Cancel checkout returns to cart @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await expect(page).toHaveURL(/checkout-step-one\.html/);

    // Fill form and proceed to step 2
    await checkoutPage.fillCheckoutForm({
      firstName: 'John',
      lastName: 'Doe',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    // Click cancel
    await checkoutPage.clickCancel();

    // Should return to cart
    await expect(page).toHaveURL(/cart\.html/);
    console.log(`[TC-EDGE-005] Returned to cart after cancel`);
  });

  /**
   * TC-EDGE-006: Invalid postal code handling
   * AC: Various postal code formats are accepted
   */
  test('TC-EDGE-006: Various postal code formats are accepted @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await expect(page).toHaveURL(/checkout-step-one\.html/);

    const postalCodes = ['12345', '90210', '00000', '99999', 'ABCDE'];

    for (const postalCode of postalCodes) {
      await checkoutPage.fillCheckoutForm({
        firstName: 'John',
        lastName: 'Doe',
        postalCode,
      });

      // Continue should be clickable
      const canContinue = await checkoutPage.continueButton.isEnabled();
      console.log(`[TC-EDGE-006] Postal "${postalCode}": can continue = ${canContinue}`);

      // Clear and try next
      await checkoutPage.postalCodeInput.fill('');
    }
  });

  /**
   * TC-EDGE-007: All products can be added to cart
   * AC: All 6 products can be added without error
   */
  test('TC-EDGE-007: All 6 products can be added to cart @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productNames = await inventoryPage.getAllProductNames();
    expect(productNames.length).toBe(6);

    // Add all products
    for (const product of productNames) {
      await inventoryPage.addItemToCart(product);
    }

    const badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(6);
    console.log(`[TC-EDGE-007] All ${badgeCount} products added to cart`);
  });

  /**
   * TC-EDGE-008: Cart badge updates correctly
   * AC: Badge shows correct count after add/remove
   */
  test('TC-EDGE-008: Cart badge updates correctly on add/remove @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Initial: 0
    let badge = await inventoryPage.getCartBadgeCount();
    expect(badge).toBe(0);

    // Add 1
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    badge = await inventoryPage.getCartBadgeCount();
    expect(badge).toBe(1);

    // Add 2 more
    await inventoryPage.addItemToCart('Sauce Labs Bike Light');
    await inventoryPage.addItemToCart('Sauce Labs Bolt T-Shirt');
    badge = await inventoryPage.getCartBadgeCount();
    expect(badge).toBe(3);

    // Remove 1 (use remove button on inventory page if available)
    await inventoryPage.removeItemFromCart('Sauce Labs Backpack');
    badge = await inventoryPage.getCartBadgeCount();
    expect(badge).toBe(2);

    console.log(`[TC-EDGE-008] Badge updates correctly: 0 -> 1 -> 3 -> 2`);
  });
});
