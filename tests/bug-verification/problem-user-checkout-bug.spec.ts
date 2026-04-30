/**
 * problem-user-checkout-bug.spec.ts
 *
 * BUG-001: problem_user — Checkout Overview Double-Charge Bug
 *
 * Bug Description:
 *   When problem_user completes checkout, the Item Total on the checkout
 *   overview page (checkout-step-two.html) is exactly 2x the correct value.
 *   Tax and Total are also wrong accordingly.
 *
 * Expected Values (single Sauce Labs Backpack @ $29.99):
 *   - Correct subtotal:   $29.99
 *   - Buggy subtotal:     $59.98  (2x correct)
 *   - Correct tax (8%):    $2.40
 *   - Buggy tax:          $4.80   (2x correct)
 *   - Correct total:     $32.39
 *   - Buggy total:        $64.78  (2x correct)
 *
 * AC:
 *   AC-001: Login with problem_user succeeds → redirected to inventory
 *   AC-002: Adding single item to cart updates badge to 1
 *   AC-003: Checkout overview subtotal matches individual cart item prices
 *           (currently FAILS due to bug — subtotal is 2x item price)
 *   AC-004: Tax = subtotal × 0.08 (currently FAILS due to bug)
 *   AC-005: Total = subtotal + tax (currently FAILS due to bug)
 *   AC-006: Order completion succeeds regardless of pricing bug
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

const { problem_user } = SAUCE_DEMO_USERS;
const TARGET_PRODUCT = 'Sauce Labs Backpack';
const EXPECTED_ITEM_PRICE = KNOWN_PRODUCT_PRICES[TARGET_PRODUCT]; // $29.99

test.describe('BUG-001: problem_user — Checkout Overview Pricing Bug', () => {
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
   * TC-BUG-001-01: problem_user login succeeds (AC-001)
   */
  test('TC-BUG-001-01: problem_user can login and reach inventory @bug @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.inventoryItems.first()).toBeVisible();
    console.log(`[BUG-001] problem_user login succeeded`);
  });

  /**
   * TC-BUG-001-02: Adding single item to cart (AC-002)
   */
  test('TC-BUG-001-02: Adding single item updates cart badge to 1 @bug @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    await inventoryPage.addItemToCart(TARGET_PRODUCT);
    const badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(1);
    console.log(`[BUG-001] Cart badge count: ${badgeCount}`);
  });

  /**
   * TC-BUG-001-03: Checkout subtotal should equal sum of cart item prices (AC-003)
   *
   * BUG VERIFICATION:
   *   PASSES if subtotalValue === EXPECTED_ITEM_PRICE ($29.99)
   *   FAILS  if subtotalValue === EXPECTED_ITEM_PRICE * 2 ($59.98) ← BUG
   *
   * This test documents the bug by asserting the EXPECTED correct value.
   * In a CI pipeline this test will FAIL until the bug is fixed.
   * We mark it @bug to clearly categorize in Allure reporting.
   */
  test('TC-BUG-001-03: Checkout subtotal equals cart item sum @bug @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Add single item to cart
    await inventoryPage.addItemToCart(TARGET_PRODUCT);
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Proceed to checkout
    await cartPage.clickCheckout();
    await expect(page).toHaveURL(/checkout-step-one\.html/);
    await checkoutPage.fillCheckoutForm({
      firstName: 'John',
      lastName: 'Doe',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    // Get actual displayed item prices from cart summary
    const actualItemPrices = await checkoutPage.getCartItemPrices();
    console.log(`[BUG-001] Actual item prices on checkout: $${actualItemPrices.join(', $')}`);

    // Sum of actual cart item prices should equal the correct item price
    const sumOfItemPrices = actualItemPrices.reduce((sum, p) => sum + p, 0);
    expect(sumOfItemPrices).toBeCloseTo(EXPECTED_ITEM_PRICE, 2);
    console.log(
      `[BUG-001] Sum of item prices: $${sumOfItemPrices} (expected: $${EXPECTED_ITEM_PRICE})`
    );

    // Get the summary totals
    const summary = await checkoutPage.getSummaryInfo();

    // THE BUG: subtotal is 2x the sum of actual item prices
    // This assertion will FAIL until bug is fixed
    console.log(`[BUG-001] Displayed subtotal: ${summary.subtotalText}`);
    console.log(`[BUG-001] Expected subtotal:  Item total: $${EXPECTED_ITEM_PRICE}`);
    console.log(`[BUG-001] Bug value (2x):     Item total: $${EXPECTED_ITEM_PRICE * 2}`);

    // AC-003: subtotal should equal sum of cart item prices
    // Bug causes: subtotal = sumOfItemPrices * 2
    expect(summary.subtotalValue).toBeCloseTo(EXPECTED_ITEM_PRICE, 2);
  });

  /**
   * TC-BUG-001-04: Tax calculation verification (AC-004)
   *
   * BUG: Tax = subtotal * 0.08 = ($59.98 * 0.08) = $4.80 (WRONG)
   * Expected: Tax = $29.99 * 0.08 = $2.40 (CORRECT)
   */
  test('TC-BUG-001-04: Tax equals subtotal × 8% @bug @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    await inventoryPage.addItemToCart(TARGET_PRODUCT);
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
    const correctSubtotal = EXPECTED_ITEM_PRICE;
    const expectedTax = calculateExpectedTax(correctSubtotal); // $2.40

    console.log(`[BUG-001] Displayed tax: ${summary.taxText}`);
    console.log(`[BUG-001] Expected tax (8% of $${correctSubtotal}): $${expectedTax}`);
    console.log(`[BUG-001] Bug tax value: $${calculateExpectedTax(correctSubtotal * 2)}`);

    // Bug causes: tax = $4.80 instead of $2.40
    // This assertion will FAIL until bug is fixed
    expect(summary.taxValue).toBeCloseTo(expectedTax, 2);
  });

  /**
   * TC-BUG-001-05: Total calculation verification (AC-005)
   *
   * BUG: Total = subtotal + tax = $59.98 + $4.80 = $64.78 (WRONG)
   * Expected: Total = $29.99 + $2.40 = $32.39 (CORRECT)
   */
  test('TC-BUG-001-05: Total equals subtotal plus tax @bug @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    await inventoryPage.addItemToCart(TARGET_PRODUCT);
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
    const correctSubtotal = EXPECTED_ITEM_PRICE;
    const expectedTotal = calculateExpectedTotal(correctSubtotal); // $32.39

    console.log(`[BUG-001] Displayed total: ${summary.totalText}`);
    console.log(`[BUG-001] Expected total: $${expectedTotal}`);
    console.log(`[BUG-001] Bug total value: $${calculateExpectedTotal(correctSubtotal * 2)}`);

    // Bug causes: total = $64.78 instead of $32.39
    // This assertion will FAIL until bug is fixed
    expect(summary.totalValue).toBeCloseTo(expectedTotal, 2);
  });

  /**
   * TC-BUG-001-06: Full bug documentation — all pricing fields (AC-003/004/005)
   *
   * Captures complete state of the pricing bug for bug report evidence.
   * Uses testInfo to attach screenshot + structured data to Allure report.
   */
  test('TC-BUG-001-06: Document full pricing bug state for BUG-001 report @bug @p2', async ({
    page,
  }, testInfo) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    await inventoryPage.addItemToCart(TARGET_PRODUCT);
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
    const sumOfItems = itemPrices.reduce((s, p) => s + p, 0);

    const expectedSubtotal = EXPECTED_ITEM_PRICE;
    const expectedTax = calculateExpectedTax(expectedSubtotal);
    const expectedTotal = calculateExpectedTotal(expectedSubtotal);

    const bugData = {
      bugId: 'BUG-001',
      user: problem_user.username,
      item: TARGET_PRODUCT,
      itemPrice: EXPECTED_ITEM_PRICE,
      sumOfItemPrices: sumOfItems,
      displayedSubtotal: summary.subtotalValue,
      expectedSubtotal,
      subtotalBugFactor: summary.subtotalValue / expectedSubtotal,
      displayedTax: summary.taxValue,
      expectedTax,
      taxBugFactor: summary.taxValue / expectedTax,
      displayedTotal: summary.totalValue,
      expectedTotal,
      totalBugFactor: summary.totalValue / expectedTotal,
      isSubtotalDoubled: Math.abs(summary.subtotalValue - expectedSubtotal * 2) < 0.01,
      isTaxDoubled: Math.abs(summary.taxValue - expectedTax * 2) < 0.01,
      isTotalDoubled: Math.abs(summary.totalValue - expectedTotal * 2) < 0.01,
      bugDescription:
        'All prices are exactly 2x correct values on checkout overview for problem_user',
    };

    console.log('[BUG-001] Bug Report:', JSON.stringify(bugData, null, 2));

    // Attach structured bug data to Allure report
    await testInfo.attach('BUG-001-evidence', {
      contentType: 'application/json',
      body: JSON.stringify(bugData, null, 2),
    });

    // Screenshot of the buggy checkout overview page
    await testInfo.attach('BUG-001-checkout-overview', {
      contentType: 'image/png',
      body: await page.screenshot({ fullPage: false }),
    });

    // Assert the bug IS present (for now we expect it to be doubled)
    // When bug is fixed, these will fail — that's the expected behavior
    expect(
      bugData.isSubtotalDoubled,
      `Subtotal should be 2x (BUG-001): got $${summary.subtotalValue}, expected $${expectedSubtotal * 2}`
    ).toBe(true);
  });

  /**
   * TC-BUG-001-07: problem_user cart prices are correct — bug is in subtotal only
   *
   * The cart item prices shown on checkout are CORRECT ($29.99).
   * The subtotal calculation is what gets doubled. This test verifies
   * the bug is isolated to the subtotal calculation, not the item prices.
   */
  test('TC-BUG-001-07: Cart item prices are correct; subtotal is doubled @bug @p2', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await inventoryPage.addItemToCart(TARGET_PRODUCT);
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'John',
      lastName: 'Doe',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    const itemPrices = await checkoutPage.getCartItemPrices();
    const summary = await checkoutPage.getSummaryInfo();

    // Verify: individual item prices are correct
    expect(itemPrices.length).toBe(1);
    expect(itemPrices[0]).toBeCloseTo(EXPECTED_ITEM_PRICE, 2);
    console.log(`[BUG-001] Item prices correct: $${itemPrices}`);

    // Verify: subtotal is WRONG (2x)
    // This test PASSES when bug is confirmed (subtotal is doubled)
    const isDoubled = Math.abs(summary.subtotalValue - EXPECTED_ITEM_PRICE * 2) < 0.01;
    console.log(
      `[BUG-001] Subtotal doubled: ${isDoubled} (displayed: $${summary.subtotalValue}, correct: $${EXPECTED_ITEM_PRICE})`
    );

    // When bug is present: subtotalValue = 59.98, expectedItemSum = 29.99
    // The bug factor should be exactly 2.0
    expect(summary.subtotalValue / EXPECTED_ITEM_PRICE).toBeCloseTo(2.0, 1);
  });

  /**
   * TC-BUG-001-08: Multiple items — verify bug scales (2x for 2 items)
   *
   * If 2 items each at $29.99 are added, subtotal should be $59.98 (correct)
   * but BUG causes subtotal to show $119.96 (2x again).
   */
  test('TC-BUG-001-08: Multiple items — subtotal is still 2x @bug @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Add 2 items
    await inventoryPage.addItemToCart(TARGET_PRODUCT);
    await inventoryPage.addItemToCart('Sauce Labs Bike Light');
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    const cartItems = await cartPage.getCartItemCount();
    expect(cartItems).toBe(2);

    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'Jane',
      lastName: 'Smith',
      postalCode: '54321',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    const summary = await checkoutPage.getSummaryInfo();
    const itemPrices = await checkoutPage.getCartItemPrices();
    const sumOfItems = itemPrices.reduce((s, p) => s + p, 0);
    const expectedSubtotal = 29.99 + 9.99; // $39.98

    console.log(
      `[BUG-001] 2-item subtotal: $${summary.subtotalValue} (correct: $${expectedSubtotal}, buggy: $${expectedSubtotal * 2})`
    );

    // Individual prices should be correct
    expect(sumOfItems).toBeCloseTo(expectedSubtotal, 2);

    // Subtotal should be doubled (bug)
    expect(summary.subtotalValue).toBeCloseTo(expectedSubtotal * 2, 2);
  });

  /**
   * TC-BUG-001-09: problem_user checkout completes successfully despite pricing bug
   *
   * The "Finish" button still works even with wrong pricing.
   * This verifies the bug is purely a display/calculation issue, not a blocker.
   */
  test('TC-BUG-001-09: Checkout completion works despite pricing bug @bug @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);
    await inventoryPage.addItemToCart(TARGET_PRODUCT);
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'John',
      lastName: 'Doe',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    // Complete purchase
    await checkoutPage.clickFinish();
    await expect(page).toHaveURL(/checkout-complete\.html/);
    const successText = await checkoutPage.getSuccessMessage();
    expect(successText.toLowerCase()).toContain('thank you for your order');
    console.log(`[BUG-001] Order completed successfully despite pricing bug`);
  });
});
