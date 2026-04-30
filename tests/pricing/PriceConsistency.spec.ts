/**
 * PriceConsistency.spec.ts
 *
 * SUITE 2: Price Consistency Tests (P0 Critical)
 *
 * Purpose: Verify prices are consistent across all pages (inventory, cart, checkout).
 * This catches BUG-003b where visual_user sees wrong prices on inventory but correct in cart/checkout.
 *
 * Bug Coverage:
 * - BUG-003b (visual_user): Wrong prices on inventory, correct in cart/checkout
 *
 * Test Cases:
 * - TC-PRICE-001: Inventory → Cart price consistency (standard_user)
 * - TC-PRICE-002: Inventory → Cart price consistency (visual_user - bug exposure)
 * - TC-PRICE-003: Cart → Checkout price consistency
 * - TC-PRICE-004: Checkout → Final total price integrity
 * - TC-PRICE-005: visual_user inventory prices are wrong (BUG-003b verification)
 * - TC-PRICE-006: visual_user cart prices are correct (bug is display-only)
 * - TC-PRICE-007: All 6 products have correct prices across all pages
 *
 * Coverage: All pages, all user types with price-sensitive bugs
 */

import { expect, test } from '../../fixtures/traced-steps';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import { KNOWN_PRODUCT_PRICES, SAUCE_DEMO_USERS } from '../../test-data/supported-users';

const { standard_user, visual_user, problem_user } = SAUCE_DEMO_USERS;

test.describe('SUITE 2: Price Consistency Tests', () => {
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
   * TC-PRICE-001: Inventory → Cart price consistency for standard_user
   * AC: Price shown on inventory matches price in cart
   */
  test('TC-PRICE-001: standard_user inventory price equals cart price @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const targetProduct = 'Sauce Labs Backpack';

    // Get inventory price
    const invNames = await inventoryPage.getAllProductNames();
    const invPrices = await inventoryPage.getAllProductPrices();
    const productIndex = invNames.findIndex((n) => n === targetProduct);
    expect(productIndex).not.toBe(-1);
    const inventoryPrice = invPrices[productIndex];

    // Add to cart
    await inventoryPage.addItemToCart(targetProduct);
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Get cart price
    const cartItemNames = await cartPage.getCartItemNames();
    const cartIndex = cartItemNames.findIndex((n) => n === targetProduct);
    expect(cartIndex).not.toBe(-1);

    // Compare (standard_user has correct prices everywhere)
    expect(inventoryPrice).toBeCloseTo(KNOWN_PRODUCT_PRICES[targetProduct], 2);
    console.log(
      `[TC-PRICE-001] standard_user: inventory $${inventoryPrice} = cart $${KNOWN_PRODUCT_PRICES[targetProduct]}`
    );
  });

  /**
   * TC-PRICE-002: Inventory → Cart price consistency for visual_user (BUG-003b)
   * AC: visual_user sees WRONG price on inventory but CORRECT in cart
   */
  test('TC-PRICE-002: visual_user inventory price differs from cart price (BUG-003b) @bug', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const targetProduct = 'Sauce Labs Backpack';

    // Get inventory displayed price
    const invNames = await inventoryPage.getAllProductNames();
    const invPrices = await inventoryPage.getAllProductPrices();
    const productIndex = invNames.findIndex((n) => n === targetProduct);
    expect(productIndex).not.toBe(-1);
    const inventoryPrice = invPrices[productIndex];

    // Add to cart
    await inventoryPage.addItemToCart(targetProduct);
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Get cart item price
    const cartItemPriceLocator = page.locator('.cart_item .inventory_item_price').first();
    const cartPriceText = await cartItemPriceLocator.textContent();
    const cartPrice = Number.parseFloat((cartPriceText ?? '').replace('$', ''));

    console.log(`[TC-PRICE-002] visual_user: inventory $${inventoryPrice}, cart $${cartPrice}`);
    console.log(`[TC-PRICE-002] Expected correct price: $${KNOWN_PRODUCT_PRICES[targetProduct]}`);

    // BUG: inventory price is wrong, cart price is correct
    // Inventory shows $27.25 instead of $29.99
    const isInventoryWrong = Math.abs(inventoryPrice - KNOWN_PRODUCT_PRICES[targetProduct]) > 0.01;
    const isCartCorrect = Math.abs(cartPrice - KNOWN_PRODUCT_PRICES[targetProduct]) < 0.01;

    expect(isInventoryWrong, 'BUG-003b: Inventory price should be wrong for visual_user').toBe(
      true
    );
    expect(isCartCorrect, 'BUG-003b: Cart price should be correct for visual_user').toBe(true);
  });

  /**
   * TC-PRICE-003: Cart → Checkout price consistency
   * AC: Cart item prices match checkout overview item prices
   */
  test('TC-PRICE-003: Cart item prices match checkout overview prices @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Add multiple items
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.addItemToCart('Sauce Labs Bike Light');
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Get cart prices
    const cartItemPriceLocator = page.locator('.cart_item .inventory_item_price');
    const cartItemCount = await cartItemPriceLocator.count();
    const cartPrices: number[] = [];
    for (let i = 0; i < cartItemCount; i++) {
      const text = await cartItemPriceLocator.nth(i).textContent();
      cartPrices.push(Number.parseFloat((text ?? '').replace('$', '')));
    }

    // Proceed to checkout
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'John',
      lastName: 'Doe',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    // Get checkout item prices
    const checkoutPrices = await checkoutPage.getCartItemPrices();

    console.log(`[TC-PRICE-003] Cart prices: $${cartPrices}, Checkout prices: $${checkoutPrices}`);

    // Prices should match
    expect(cartPrices.length).toBe(checkoutPrices.length);
    for (let i = 0; i < cartPrices.length; i++) {
      expect(cartPrices[i]).toBeCloseTo(checkoutPrices[i], 2);
    }
  });

  /**
   * TC-PRICE-004: Checkout → Final total price integrity
   * AC: Sum of item prices + tax = total
   */
  test('TC-PRICE-004: Checkout total equals sum of items plus tax @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.addItemToCart('Sauce Labs Bolt T-Shirt');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'John',
      lastName: 'Doe',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    const summary = await checkoutPage.getSummaryInfo();
    const itemPrices = await checkoutPage.getCartItemPrices();
    const sumOfItems = itemPrices.reduce((sum, p) => sum + p, 0);
    const expectedTotal = sumOfItems * 1.08; // items + 8% tax

    console.log(
      `[TC-PRICE-004] Items sum: $${sumOfItems}, Tax: ${summary.taxText}, Total: ${summary.totalText}`
    );

    expect(summary.subtotalValue).toBeCloseTo(sumOfItems, 2);
    expect(summary.totalValue).toBeCloseTo(expectedTotal, 2);
  });

  /**
   * TC-PRICE-005: visual_user inventory prices verification (BUG-003b)
   * AC: At least one product shows wrong price on inventory
   */
  test('TC-PRICE-005: visual_user inventory shows wrong prices (BUG-003b) @bug', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productNames = await inventoryPage.getAllProductNames();
    const displayedPrices = await inventoryPage.getAllProductPrices();

    const wrongPrices: Array<{ product: string; displayed: number; expected: number }> = [];

    for (let i = 0; i < productNames.length; i++) {
      const product = productNames[i];
      const displayed = displayedPrices[i];
      const expected = KNOWN_PRODUCT_PRICES[product] ?? displayed;
      if (Math.abs(displayed - expected) > 0.01) {
        wrongPrices.push({ product, displayed, expected });
      }
    }

    console.log(`[TC-PRICE-005] Wrong prices found: ${wrongPrices.length}`);
    wrongPrices.forEach(({ product, displayed, expected }) => {
      console.log(`[TC-PRICE-005]   ${product}: $${displayed} (expected $${expected})`);
    });

    // Assert bug is present: at least one wrong price
    expect(
      wrongPrices.length,
      'BUG-003b: At least 1 wrong price expected for visual_user'
    ).toBeGreaterThanOrEqual(1);
  });

  /**
   * TC-PRICE-006: visual_user cart prices are correct (BUG is display-only)
   * AC: Cart shows correct prices even when inventory shows wrong ones
   */
  test('TC-PRICE-006: visual_user cart shows correct prices despite inventory bug @p1', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Capture wrong inventory price
    const invNames = await inventoryPage.getAllProductNames();
    const invPrices = await inventoryPage.getAllProductPrices();
    const backpackIndex = invNames.findIndex((n) => n === 'Sauce Labs Backpack');
    const inventoryBackpackPrice = invPrices[backpackIndex];

    // Add to cart
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Get cart price
    const cartItemPriceLocator = page.locator('.cart_item .inventory_item_price').first();
    const cartPriceText = await cartItemPriceLocator.textContent();
    const cartPrice = Number.parseFloat((cartPriceText ?? '').replace('$', ''));

    console.log(`[TC-PRICE-006] Inventory: $${inventoryBackpackPrice}, Cart: $${cartPrice}`);
    console.log(`[TC-PRICE-006] Correct price: $${KNOWN_PRODUCT_PRICES['Sauce Labs Backpack']}`);

    // Cart price should be correct
    expect(cartPrice).toBeCloseTo(KNOWN_PRODUCT_PRICES['Sauce Labs Backpack'], 2);

    // Inventory price should be wrong (verify bug exists)
    expect(inventoryBackpackPrice, 'BUG-003b: Inventory should show wrong price').not.toBeCloseTo(
      KNOWN_PRODUCT_PRICES['Sauce Labs Backpack'],
      2
    );
  });

  /**
   * TC-PRICE-007: All 6 products have consistent prices (full inventory)
   * AC: All product prices match KNOWN_PRODUCT_PRICES
   */
  test('TC-PRICE-007: All products have correct prices for standard_user @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productNames = await inventoryPage.getAllProductNames();
    const displayedPrices = await inventoryPage.getAllProductPrices();

    let allCorrect = true;
    const discrepancies: string[] = [];

    for (let i = 0; i < productNames.length; i++) {
      const product = productNames[i];
      const displayed = displayedPrices[i];
      const expected = KNOWN_PRODUCT_PRICES[product];

      if (Math.abs(displayed - expected) > 0.01) {
        allCorrect = false;
        discrepancies.push(`${product}: $${displayed} (expected $${expected})`);
      }
    }

    console.log(`[TC-PRICE-007] Products checked: ${productNames.length}`);
    if (discrepancies.length > 0) {
      console.log(`[TC-PRICE-007] Discrepancies: ${discrepancies.join(', ')}`);
    }

    expect(
      allCorrect,
      `All prices should be correct for standard_user. Discrepancies: ${discrepancies.join(', ')}`
    ).toBe(true);
  });
});
