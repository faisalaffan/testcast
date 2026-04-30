/**
 * CartOperations.spec.ts
 *
 * SUITE 6: Cart Operations Tests
 *
 * Comprehensive cart operations for all user types:
 * - Add/remove items
 * - Cart badge updates
 * - Cart persistence
 * - Cart total calculations
 * - Empty cart behavior
 * - Cart checkout flow
 *
 * Coverage for:
 * - BUG-001: problem_user checkout double-charge (partial - cart operations)
 * - BUG-003b: visual_user wrong display prices (cart prices are CORRECT)
 * - All user types: standard_user, problem_user, error_user, visual_user, performance_glitch_user
 */

import { expect, test } from '../../fixtures/traced-steps';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import {
  KNOWN_PRODUCT_PRICES,
  SAUCE_DEMO_USERS,
  calculateExpectedTax,
  calculateExpectedTotal,
} from '../../test-data/supported-users';

const { standard_user, problem_user, error_user, visual_user, performance_glitch_user } =
  SAUCE_DEMO_USERS;

test.describe('SUITE 6: Cart Operations Tests', () => {
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

  // ==============================================================
  // TC-CART-001 to TC-CART-003: Add to Cart Operations
  // ==============================================================

  /**
   * TC-CART-001: Add single item to cart
   *
   * Verify that clicking "Add to Cart" on an inventory item:
   * 1. Updates cart badge to 1
   * 2. Item appears in cart with correct name and price
   */
  test('TC-CART-001: Add single item to cart updates badge and cart contents @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Add Sauce Labs Backpack to cart
    const targetProduct = 'Sauce Labs Backpack';
    const expectedPrice = KNOWN_PRODUCT_PRICES[targetProduct];

    await inventoryPage.addItemToCart(targetProduct);

    // Verify badge count is 1
    const badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(1);
    console.log(`[CART-001] Cart badge count after adding 1 item: ${badgeCount}`);

    // Navigate to cart and verify item
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    const cartItems = await cartPage.getCartItemNames();
    expect(cartItems).toContain(targetProduct);

    const cartPrices = await cartPage.getCartItemPrices();
    expect(cartPrices).toContain(expectedPrice);
    console.log(`[CART-001] Cart contains: ${targetProduct} @ $${expectedPrice}`);
  });

  /**
   * TC-CART-002: Add multiple items to cart
   *
   * Verify adding 3 different items:
   * 1. Badge shows 3
   * 2. All 3 items appear in cart
   * 3. Cart total equals sum of item prices
   */
  test('TC-CART-002: Add multiple items to cart shows correct count and totals @p1', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productsToAdd = [
      'Sauce Labs Backpack',
      'Sauce Labs Bike Light',
      'Sauce Labs Bolt T-Shirt',
    ];
    const expectedPrices = productsToAdd.map((p) => KNOWN_PRODUCT_PRICES[p]);
    const expectedTotal = expectedPrices.reduce((sum, p) => sum + p, 0);

    // Add each product to cart
    for (const product of productsToAdd) {
      await inventoryPage.addItemToCart(product);
    }

    // Verify badge count
    const badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(3);
    console.log(`[CART-002] Cart badge count: ${badgeCount}`);

    // Navigate to cart and verify items
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    const cartItems = await cartPage.getCartItemNames();
    for (const product of productsToAdd) {
      expect(cartItems).toContain(product);
    }

    // Verify item prices sum correctly
    const cartPrices = await cartPage.getCartItemPrices();
    const calculatedTotal = cartPrices.reduce((sum, p) => sum + p, 0);
    expect(calculatedTotal).toBeCloseTo(expectedTotal, 2);
    console.log(`[CART-002] Cart total: $${calculatedTotal} (expected: $${expectedTotal})`);
  });

  /**
   * TC-CART-003: Add all 6 products to cart
   *
   * Full cart scenario: all 6 products added
   * Verify badge shows 6 and cart total is correct
   */
  test('TC-CART-003: Add all 6 products to cart shows correct count @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Get all product names
    const allProducts = await inventoryPage.getAllProductNames();
    expect(allProducts.length).toBe(6);

    // Add all products
    for (const product of allProducts) {
      await inventoryPage.addItemToCart(product);
    }

    // Verify badge count is 6
    const badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(6);
    console.log(`[CART-003] Cart badge count after adding all 6 items: ${badgeCount}`);

    // Navigate to cart
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    const cartItems = await cartPage.getCartItemNames();
    expect(cartItems.length).toBe(6);

    // Verify cart total
    const cartPrices = await cartPage.getCartItemPrices();
    const expectedTotal = Object.values(KNOWN_PRODUCT_PRICES).reduce((sum, p) => sum + p, 0);
    const actualTotal = cartPrices.reduce((sum, p) => sum + p, 0);
    expect(actualTotal).toBeCloseTo(expectedTotal, 2);
    console.log(`[CART-003] Full cart total: $${actualTotal}`);
  });

  // ==============================================================
  // TC-CART-004 to TC-CART-005: Remove from Cart
  // ==============================================================

  /**
   * TC-CART-004: Remove item from cart
   *
   * Add 2 items, remove 1, verify:
   * 1. Badge shows 1
   * 2. Only 1 item remains in cart
   */
  test('TC-CART-004: Remove item from cart decrements badge and removes item @p1', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Add 2 items
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.addItemToCart('Sauce Labs Bike Light');

    let badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(2);
    console.log(`[CART-004] Badge count after adding 2 items: ${badgeCount}`);

    // Navigate to cart
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Remove first item
    await cartPage.removeItem('Sauce Labs Backpack');

    // Verify only 1 item remains
    const remainingItems = await cartPage.getCartItemNames();
    expect(remainingItems.length).toBe(1);
    expect(remainingItems).not.toContain('Sauce Labs Backpack');
    expect(remainingItems).toContain('Sauce Labs Bike Light');
    console.log(`[CART-004] Remaining item: ${remainingItems[0]}`);

    // Go back to inventory and verify badge
    await cartPage.clickContinueShopping();
    await expect(page).toHaveURL(/inventory\.html/);

    badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(1);
  });

  /**
   * TC-CART-005: Empty cart has no checkout button
   *
   * Verify empty cart state:
   * 1. Cart badge is 0 or not visible
   * 2. Checkout button is not present or disabled
   */
  test('TC-CART-005: Empty cart shows no checkout option @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Navigate directly to cart (empty)
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Verify empty state
    const cartItems = await cartPage.getCartItemNames();
    expect(cartItems.length).toBe(0);

    // Verify checkout button is not visible
    const checkoutButtonVisible = await cartPage.checkoutButton.isVisible().catch(() => false);
    if (!checkoutButtonVisible) {
      console.log(`[CART-005] Checkout button not visible for empty cart (correct)`);
    } else {
      // If visible, it should be disabled
      const isDisabled = await cartPage.checkoutButton.isDisabled();
      expect(isDisabled).toBe(true);
      console.log(`[CART-005] Checkout button disabled for empty cart (correct)`);
    }
  });

  // ==============================================================
  // TC-CART-006 to TC-CART-007: Cart Total Calculations
  // ==============================================================

  /**
   * TC-CART-006: Cart total equals sum of item prices
   *
   * Verify cart calculation:
   * 1. Add 3 items with known prices
   * 2. Verify sum matches KNOWN_PRODUCT_PRICES
   */
  test('TC-CART-006: Cart total equals sum of individual item prices @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productsToAdd = [
      'Sauce Labs Backpack',
      'Sauce Labs Bolt T-Shirt',
      'Sauce Labs Fleece Jacket',
    ];
    const expectedPrices = productsToAdd.map((p) => KNOWN_PRODUCT_PRICES[p]);
    const expectedSubtotal = expectedPrices.reduce((sum, p) => sum + p, 0);

    // Add items
    for (const product of productsToAdd) {
      await inventoryPage.addItemToCart(product);
    }

    // Navigate to cart
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Get cart item prices
    const cartPrices = await cartPage.getCartItemPrices();
    const actualSubtotal = cartPrices.reduce((sum, p) => sum + p, 0);

    console.log(`[CART-006] Cart prices: $${cartPrices.join(', $')}`);
    console.log(`[CART-006] Expected subtotal: $${expectedSubtotal}, Actual: $${actualSubtotal}`);

    expect(actualSubtotal).toBeCloseTo(expectedSubtotal, 2);
  });

  /**
   * TC-CART-007: problem_user cart prices are correct (BUG-001 partial verification)
   *
   * BUG-001 affects checkout subtotal calculation, NOT cart item prices.
   * This test verifies cart prices are correct for problem_user.
   */
  test('TC-CART-007: problem_user cart item prices are correct (BUG-001 partial) @bug @p2', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Add items
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.addItemToCart('Sauce Labs Bike Light');

    // Navigate to cart
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Get cart item prices
    const cartPrices = await cartPage.getCartItemPrices();
    const expectedPrices = [
      KNOWN_PRODUCT_PRICES['Sauce Labs Backpack'],
      KNOWN_PRODUCT_PRICES['Sauce Labs Bike Light'],
    ];

    console.log(`[CART-007] problem_user cart prices: $${cartPrices.join(', $')}`);
    console.log(`[CART-007] Expected prices: $${expectedPrices.join(', $')}`);

    // Cart item prices should be CORRECT even for problem_user
    expect(cartPrices[0]).toBeCloseTo(expectedPrices[0], 2);
    expect(cartPrices[1]).toBeCloseTo(expectedPrices[1], 2);

    // BUG-001: The subtotal on checkout-step-two will be DOUBLED, but cart is fine
    console.log(`[CART-007] Cart prices are correct - BUG-001 affects checkout subtotal only`);
  });

  // ==============================================================
  // TC-CART-008: visual_user Cart Prices Are Correct
  // ==============================================================

  /**
   * TC-CART-008: visual_user cart prices are correct despite wrong inventory display prices
   *
   * BUG-003b: visual_user shows wrong prices on INVENTORY page
   * but cart and checkout show CORRECT prices
   */
  test('TC-CART-008: visual_user cart shows correct prices despite wrong inventory display @bug @p2', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Get inventory displayed price for backpack
    const invPrices = await inventoryPage.getAllProductPrices();
    const invNames = await inventoryPage.getAllProductNames();
    const backpackIndex = invNames.findIndex((n) => n === 'Sauce Labs Backpack');
    const inventoryBackpackPrice = invPrices[backpackIndex];

    // Add to cart
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Get cart price
    const cartPrices = await cartPage.getCartItemPrices();
    const correctPrice = KNOWN_PRODUCT_PRICES['Sauce Labs Backpack'];

    console.log(`[CART-008] visual_user - Inventory displayed: $${inventoryBackpackPrice}`);
    console.log(`[CART-008] visual_user - Cart price: $${cartPrices[0]}`);
    console.log(`[CART-008] visual_user - Correct price: $${correctPrice}`);

    // Cart price should be CORRECT even though inventory showed wrong price
    expect(cartPrices[0]).toBeCloseTo(correctPrice, 2);

    // Inventory displayed price should be WRONG (bug is present)
    expect(
      inventoryBackpackPrice,
      'BUG-003b: Inventory price should be wrong for visual_user'
    ).not.toBeCloseTo(correctPrice, 2);
    console.log(`[CART-008] BUG-003b verified: Inventory wrong ($27.25), Cart correct ($29.99)`);
  });

  // ==============================================================
  // TC-CART-009: Cart Badge Behavior
  // ==============================================================

  /**
   * TC-CART-009: Cart badge updates correctly on add/remove
   *
   * Comprehensive badge update test:
   * 1. Add item -> badge 1
   * 2. Add another -> badge 2
   * 3. Remove one -> badge 1
   * 4. Remove all -> badge 0
   */
  test('TC-CART-009: Cart badge updates correctly on add and remove operations @p1', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Step 1: Add first item
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    let badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(1);
    console.log(`[CART-009] After adding Backpack: badge = ${badgeCount}`);

    // Step 2: Add second item
    await inventoryPage.addItemToCart('Sauce Labs Bike Light');
    badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(2);
    console.log(`[CART-009] After adding Bike Light: badge = ${badgeCount}`);

    // Navigate to cart
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Step 3: Remove one item
    await cartPage.removeItem('Sauce Labs Backpack');

    let cartItems = await cartPage.getCartItemNames();
    expect(cartItems.length).toBe(1);

    // Go back to inventory and check badge
    await cartPage.clickContinueShopping();
    await expect(page).toHaveURL(/inventory\.html/);

    badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(1);
    console.log(`[CART-009] After removing Backpack: badge = ${badgeCount}`);

    // Step 4: Remove remaining item
    await inventoryPage.clickCart();
    await cartPage.removeItem('Sauce Labs Bike Light');

    // Verify empty
    cartItems = await cartPage.getCartItemNames();
    expect(cartItems.length).toBe(0);
    console.log(`[CART-009] After removing all items: cart is empty`);
  });

  // ==============================================================
  // TC-CART-010: Checkout Flow from Cart
  // ==============================================================

  /**
   * TC-CART-010: Complete checkout flow from cart
   *
   * End-to-end cart checkout:
   * 1. Add items to cart
   * 2. Proceed to checkout
   * 3. Fill checkout form
   * 4. Complete order
   */
  test('TC-CART-010: Complete checkout flow from cart succeeds @critical @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Add item to cart
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Click checkout
    await cartPage.clickCheckout();
    await expect(page).toHaveURL(/checkout-step-one\.html/);

    // Fill checkout form
    await checkoutPage.fillCheckoutForm({
      firstName: 'Test',
      lastName: 'User',
      postalCode: '12345',
    });

    // Continue to overview
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    // Verify prices
    const summary = await checkoutPage.getSummaryInfo();
    const itemPrice = KNOWN_PRODUCT_PRICES['Sauce Labs Backpack'];
    const expectedTax = calculateExpectedTax(itemPrice);
    const expectedTotal = calculateExpectedTotal(itemPrice);

    expect(summary.subtotalValue).toBeCloseTo(itemPrice, 2);
    expect(summary.taxValue).toBeCloseTo(expectedTax, 2);
    expect(summary.totalValue).toBeCloseTo(expectedTotal, 2);
    console.log(
      `[CART-010] Checkout summary - Subtotal: $${summary.subtotalValue}, Tax: $${summary.taxValue}, Total: $${summary.totalValue}`
    );

    // Complete order
    await checkoutPage.clickFinish();
    await expect(page).toHaveURL(/checkout-complete\.html/);

    const successMessage = await checkoutPage.getSuccessMessage();
    expect(successMessage.toLowerCase()).toContain('thank you for your order');
    console.log(`[CART-010] Order completed successfully`);
  });

  // ==============================================================
  // TC-CART-011: All Users Cart Operations (Independent Tests)
  // ==============================================================

  /**
   * TC-CART-011a: standard_user - add items to cart and checkout
   */
  test('TC-CART-011a: standard_user - cart checkout flow @critical @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page.locator('[data-test="login-button"]')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-test="inventory-item"]').first()).toBeVisible({
      timeout: 10000,
    });

    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    expect(await inventoryPage.getCartBadgeCount()).toBe(1);

    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);
    expect(await cartPage.getCartItemNames()).toContain('Sauce Labs Backpack');

    await cartPage.clickCheckout();
    await expect(page).toHaveURL(/checkout-step-one\.html/);
    await checkoutPage.fillCheckoutForm({
      firstName: 'Test',
      lastName: 'User',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    const summary = await checkoutPage.getSummaryInfo();
    expect(summary.subtotalValue).toBeGreaterThan(0);
    console.log(`[CART-011a] standard_user - Subtotal: $${summary.subtotalValue}`);
  });

  /**
   * TC-CART-011b: problem_user - cart checkout flow
   */
  test('TC-CART-011b: problem_user - cart checkout flow @critical @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await expect(page.locator('[data-test="login-button"]')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-test="inventory-item"]').first()).toBeVisible({
      timeout: 10000,
    });

    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    expect(await inventoryPage.getCartBadgeCount()).toBe(1);

    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);
    expect(await cartPage.getCartItemNames()).toContain('Sauce Labs Backpack');

    await cartPage.clickCheckout();
    await expect(page).toHaveURL(/checkout-step-one\.html/);
    await checkoutPage.fillCheckoutForm({
      firstName: 'Test',
      lastName: 'User',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    const summary = await checkoutPage.getSummaryInfo();
    expect(summary.subtotalValue).toBeGreaterThan(0);
    console.log(`[CART-011b] problem_user - Subtotal: $${summary.subtotalValue}`);
  });

  /**
   * TC-CART-011c: error_user - cart checkout flow
   */
  test('TC-CART-011c: error_user - cart checkout flow @critical @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page.locator('[data-test="login-button"]')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-test="inventory-item"]').first()).toBeVisible({
      timeout: 10000,
    });

    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    expect(await inventoryPage.getCartBadgeCount()).toBe(1);

    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);
    expect(await cartPage.getCartItemNames()).toContain('Sauce Labs Backpack');

    await cartPage.clickCheckout();
    await expect(page).toHaveURL(/checkout-step-one\.html/);
    await checkoutPage.fillCheckoutForm({
      firstName: 'Test',
      lastName: 'User',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    const summary = await checkoutPage.getSummaryInfo();
    expect(summary.subtotalValue).toBeGreaterThan(0);
    console.log(`[CART-011c] error_user - Subtotal: $${summary.subtotalValue}`);
  });

  /**
   * TC-CART-011d: visual_user - cart checkout flow
   */
  test('TC-CART-011d: visual_user - cart checkout flow @critical @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page.locator('[data-test="login-button"]')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-test="inventory-item"]').first()).toBeVisible({
      timeout: 10000,
    });

    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    expect(await inventoryPage.getCartBadgeCount()).toBe(1);

    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);
    expect(await cartPage.getCartItemNames()).toContain('Sauce Labs Backpack');

    await cartPage.clickCheckout();
    await expect(page).toHaveURL(/checkout-step-one\.html/);
    await checkoutPage.fillCheckoutForm({
      firstName: 'Test',
      lastName: 'User',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    const summary = await checkoutPage.getSummaryInfo();
    expect(summary.subtotalValue).toBeGreaterThan(0);
    console.log(`[CART-011d] visual_user - Subtotal: $${summary.subtotalValue}`);
  });

  /**
   * TC-CART-011e: performance_glitch_user - cart checkout flow
   */
  test('TC-CART-011e: performance_glitch_user - cart checkout flow @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(performance_glitch_user.username, performance_glitch_user.password);
    await expect(page.locator('[data-test="login-button"]')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-test="inventory-item"]').first()).toBeVisible({
      timeout: 10000,
    });

    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    expect(await inventoryPage.getCartBadgeCount()).toBe(1);

    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);
    expect(await cartPage.getCartItemNames()).toContain('Sauce Labs Backpack');

    await cartPage.clickCheckout();
    await expect(page).toHaveURL(/checkout-step-one\.html/);
    await checkoutPage.fillCheckoutForm({
      firstName: 'Test',
      lastName: 'User',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    const summary = await checkoutPage.getSummaryInfo();
    expect(summary.subtotalValue).toBeGreaterThan(0);
    console.log(`[CART-011e] performance_glitch_user - Subtotal: $${summary.subtotalValue}`);
  });

  // ==============================================================
  // TC-CART-012: Cart Item Quantity Not Supported (Single Add)
  // ==============================================================

  /**
   * TC-CART-012: Adding same item twice increments quantity (single-add mode)
   *
   * Note: SauceDemo cart doesn't have quantity selectors - each add increments count
   * Verify adding same item twice shows badge count of 2
   */
  test('TC-CART-012: Adding same item twice increments badge count @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Add same item twice
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.addItemToCart('Sauce Labs Backpack');

    const badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(2);
    console.log(`[CART-012] Badge count after adding same item twice: ${badgeCount}`);

    // In cart, should show quantity of 2 or two line items (depending on implementation)
    await inventoryPage.clickCart();
    const cartItems = await cartPage.getCartItemNames();

    // Cart should reflect 2 items
    const cartCount = await cartPage.getCartItemCount();
    expect(cartCount).toBe(2);
    console.log(`[CART-012] Cart item count: ${cartCount}`);
  });
});
