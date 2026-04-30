/**
 * user-journeys.spec.ts
 *
 * Cross-user journey tests covering all 6 SauceDemo user types.
 * These tests verify complete end-to-end journeys for each user type,
 * catching behavioral differences and cross-page interactions.
 *
 * User Types:
 *   1. standard_user      — Happy path (all features work)
 *   2. problem_user       — Checkout pricing bug on overview
 *   3. error_user         — Product detail render error
 *   4. visual_user        — Broken images + wrong display prices
 *   5. performance_glitch_user — Login delay (2000ms)
 *   6. locked_out_user    — Correctly blocked from login
 *
 * AC:
 *   AC-001: All login-able users reach inventory after login
 *   AC-002: All users can browse product list
 *   AC-003: All users can add items to cart
 *   AC-004: standard_user cart total = sum of item prices
 *   AC-005: Cart persists across page navigation for logged-in users
 *   AC-006: Checkout flow completes for all users who can log in
 */

import { expect, test } from '../../fixtures/traced-steps';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import { ProductDetailPage } from '../../pages/ProductDetailPage';
import {
  KNOWN_PRODUCT_PRICES,
  SAUCE_DEMO_USERS,
  calculateExpectedTax,
  calculateExpectedTotal,
} from '../../test-data/supported-users';

// ==============================================================
// Data-Driven: All User Types Login Behavior
// ==============================================================

test.describe('User Journey — All User Types Login Behavior', () => {
  const userTypes = [
    { key: 'standard_user', shouldLogin: true },
    { key: 'locked_out_user', shouldLogin: false },
    { key: 'problem_user', shouldLogin: true },
    { key: 'performance_glitch_user', shouldLogin: true },
    { key: 'error_user', shouldLogin: true },
    { key: 'visual_user', shouldLogin: true },
  ] as const;

  for (const { key, shouldLogin } of userTypes) {
    test(`DDT-Journey: ${key} login behavior @critical @p0`, async ({ page }) => {
      const user = SAUCE_DEMO_USERS[key];
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login(user.username, user.password);

      if (shouldLogin) {
        await expect(page).toHaveURL(/inventory\.html/);
        const products = await page.locator('[data-test="inventory-item"]').count();
        expect(products).toBe(6);
        console.log(`[Journey] ${key}: Login succeeded, ${products} products visible`);
      } else {
        await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
        await expect(page).not.toHaveURL(/inventory\.html/);
        console.log(`[Journey] ${key}: Login blocked, error shown`);
      }
    });
  }
});

// ==============================================================
// Standard User — Full Happy Path Journey
// ==============================================================

test.describe('User Journey — standard_user (Happy Path)', () => {
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
   * TC-JOURNEY-SU-01: Full purchase journey — single item
   */
  test('TC-JOURNEY-SU-01: Complete purchase journey with single item @critical @smoke @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(
      SAUCE_DEMO_USERS.standard_user.username,
      SAUCE_DEMO_USERS.standard_user.password
    );
    await expect(page).toHaveURL(/inventory\.html/);

    // Add item
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    expect(await inventoryPage.getCartBadgeCount()).toBe(1);

    // Go to cart
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);
    expect(await cartPage.getCartItemCount()).toBe(1);

    // Checkout
    await cartPage.clickCheckout();
    await expect(page).toHaveURL(/checkout-step-one\.html/);
    await checkoutPage.fillCheckoutForm({
      firstName: 'John',
      lastName: 'Doe',
      postalCode: '12345',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    // Verify pricing (standard_user: correct prices)
    const summary = await checkoutPage.getSummaryInfo();
    expect(summary.subtotalValue).toBeCloseTo(29.99, 2);
    expect(summary.taxValue).toBeCloseTo(calculateExpectedTax(29.99), 2);
    expect(summary.totalValue).toBeCloseTo(calculateExpectedTotal(29.99), 2);

    // Complete purchase
    await checkoutPage.clickFinish();
    await expect(page).toHaveURL(/checkout-complete\.html/);
    const successMsg = await checkoutPage.getSuccessMessage();
    expect(successMsg.toLowerCase()).toContain('thank you');
    console.log(`[Journey] standard_user: Full purchase journey completed`);
  });

  /**
   * TC-JOURNEY-SU-02: Full purchase journey — multiple items with sorting
   */
  test('TC-JOURNEY-SU-02: Purchase with multiple items and price sorting @integration @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(
      SAUCE_DEMO_USERS.standard_user.username,
      SAUCE_DEMO_USERS.standard_user.password
    );
    await expect(page).toHaveURL(/inventory\.html/);

    // Sort by price: low to high
    await inventoryPage.selectSortOption('lohi');
    const pricesAfterSort = await inventoryPage.getAllProductPrices();

    // Verify ascending order
    for (let i = 0; i < pricesAfterSort.length - 1; i++) {
      expect(pricesAfterSort[i]).toBeLessThanOrEqual(pricesAfterSort[i + 1]);
    }

    // Add 3 items
    const productNames = await inventoryPage.getAllProductNames();
    for (const name of productNames.slice(0, 3)) {
      await inventoryPage.addItemToCart(name);
    }
    expect(await inventoryPage.getCartBadgeCount()).toBe(3);

    // Navigate to cart and verify
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);
    expect(await cartPage.getCartItemCount()).toBe(3);

    console.log(`[Journey] standard_user: 3-item cart with sorting verified`);
  });

  /**
   * TC-JOURNEY-SU-03: Product detail page journey
   */
  test('TC-JOURNEY-SU-03: View product detail and add to cart @integration @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(
      SAUCE_DEMO_USERS.standard_user.username,
      SAUCE_DEMO_USERS.standard_user.password
    );
    await expect(page).toHaveURL(/inventory\.html/);

    // Click on Sauce Labs Backpack
    const backpackLink = page.locator('[data-test="inventory-item-name"]', {
      hasText: 'Sauce Labs Backpack',
    });
    await backpackLink.click();
    await expect(page).toHaveURL(/inventory-item/);

    // Verify product detail
    expect(await productDetailPage.getProductName()).toBe('Sauce Labs Backpack');
    expect(await productDetailPage.getPrice()).toBeCloseTo(29.99, 2);

    // Add to cart from detail page
    await productDetailPage.addToCart();
    await expect(productDetailPage.removeButton).toBeVisible();

    // Go back and verify cart badge
    await productDetailPage.backToProducts();
    await expect(page).toHaveURL(/inventory\.html/);
    expect(await inventoryPage.getCartBadgeCount()).toBe(1);
    console.log(`[Journey] standard_user: Product detail page journey completed`);
  });
});

// ==============================================================
// Problem User — Cart Journey (verifies cart prices are correct)
// ==============================================================

test.describe('User Journey — problem_user (Cart Correct, Checkout Bug)', () => {
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
   * TC-JOURNEY-PU-01: Cart prices are correct for problem_user
   * Bug is only on checkout overview subtotal calculation.
   */
  test('TC-JOURNEY-PU-01: Cart prices correct; checkout has pricing bug @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(
      SAUCE_DEMO_USERS.problem_user.username,
      SAUCE_DEMO_USERS.problem_user.password
    );
    await expect(page).toHaveURL(/inventory\.html/);

    // Add single item to cart
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Get cart item price
    const cartPriceText = await page
      .locator('.cart_item .inventory_item_price')
      .first()
      .textContent();
    const cartPrice = Number.parseFloat((cartPriceText ?? '').replace('$', ''));

    // Cart price should be CORRECT ($29.99)
    expect(cartPrice, 'Cart price should be correct ($29.99) even for problem_user').toBeCloseTo(
      29.99,
      2
    );
    console.log(`[Journey] problem_user cart price correct: $${cartPrice}`);

    // Proceed to checkout
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'Jane',
      lastName: 'Doe',
      postalCode: '54321',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    // Checkout item prices are correct
    const checkoutPrices = await checkoutPage.getCartItemPrices();
    expect(checkoutPrices[0]).toBeCloseTo(29.99, 2);

    // But subtotal is WRONG (doubled) — this will fail
    const summary = await checkoutPage.getSummaryInfo();
    console.log(
      `[Journey] problem_user checkout subtotal: $${summary.subtotalValue} (correct: $29.99, buggy: $59.98)`
    );

    // Assert bug is present (subtotal is doubled)
    expect(summary.subtotalValue / 29.99).toBeCloseTo(2.0, 1);
  });

  /**
   * TC-JOURNEY-PU-02: problem_user can complete order despite pricing bug
   */
  test('TC-JOURNEY-PU-02: Order completes despite checkout pricing bug @bug @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(
      SAUCE_DEMO_USERS.problem_user.username,
      SAUCE_DEMO_USERS.problem_user.password
    );
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'Jane',
      lastName: 'Doe',
      postalCode: '54321',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    // Finish order despite bug
    await checkoutPage.clickFinish();
    await expect(page).toHaveURL(/checkout-complete\.html/);
    const success = await checkoutPage.getSuccessMessage();
    expect(success.toLowerCase()).toContain('thank you');
    console.log(`[Journey] problem_user: Order completed despite pricing bug`);
  });
});

// ==============================================================
// Error User — Product Detail Journey
// ==============================================================

test.describe('User Journey — error_user (Product Detail Render Error)', () => {
  let loginPage: LoginPage;
  let inventoryPage: InventoryPage;
  let productDetailPage: ProductDetailPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inventoryPage = new InventoryPage(page);
    productDetailPage = new ProductDetailPage(page);
  });

  test.afterEach(async ({ page }) => {
    if (await inventoryPage.isOnInventoryPage()) {
      await inventoryPage.logout();
    }
  });

  /**
   * TC-JOURNEY-EU-01: error_user product detail shows render error
   */
  test('TC-JOURNEY-EU-01: error_user product detail shows render error @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(
      SAUCE_DEMO_USERS.error_user.username,
      SAUCE_DEMO_USERS.error_user.password
    );
    await expect(page).toHaveURL(/inventory\.html/);

    // Click product
    const productLink = page.locator('[data-test="inventory-item-name"]', {
      hasText: 'Sauce Labs Backpack',
    });
    await productLink.click();
    await expect(page).toHaveURL(/inventory-item/);

    // Product name and price should display (only description broken)
    expect(await productDetailPage.getProductName()).toBe('Sauce Labs Backpack');
    expect(await productDetailPage.getPrice()).toBeCloseTo(29.99, 2);

    // Description should show error
    const description = await productDetailPage.getDescription();
    expect(description).toMatch(/failed to render/i);
    console.log(`[Journey] error_user: Product detail shows render error (name/price OK)`);
  });

  /**
   * TC-JOURNEY-EU-02: error_user can add to cart from inventory (workaround)
   */
  test('TC-JOURNEY-EU-02: error_user can add to cart from inventory without viewing detail @bug @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(
      SAUCE_DEMO_USERS.error_user.username,
      SAUCE_DEMO_USERS.error_user.password
    );
    await expect(page).toHaveURL(/inventory\.html/);

    // Add directly from inventory (bypass broken detail page)
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    expect(await inventoryPage.getCartBadgeCount()).toBe(1);
    console.log(
      `[Journey] error_user: Can add to cart from inventory (workaround for broken detail)`
    );
  });
});

// ==============================================================
// Visual User — Visual Defects Journey
// ==============================================================

test.describe('User Journey — visual_user (Broken Images + Wrong Prices)', () => {
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
   * TC-JOURNEY-VU-01: visual_user — inventory wrong prices, cart correct prices
   */
  test('TC-JOURNEY-VU-01: visual_user sees wrong prices on inventory but correct in cart @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(
      SAUCE_DEMO_USERS.visual_user.username,
      SAUCE_DEMO_USERS.visual_user.password
    );
    await expect(page).toHaveURL(/inventory\.html/);

    // Capture inventory prices
    const inventoryPrices = await inventoryPage.getAllProductPrices();
    const inventoryNames = await inventoryPage.getAllProductNames();

    // Find backpack index
    const backpackIdx = inventoryNames.findIndex((n) => n === 'Sauce Labs Backpack');
    const invBackpackPrice = inventoryPrices[backpackIdx];
    console.log(`[Journey] visual_user inventory Backpack price: $${invBackpackPrice}`);

    // Add to cart
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Get cart price
    const cartPriceText = await page
      .locator('.cart_item .inventory_item_price')
      .first()
      .textContent();
    const cartPrice = Number.parseFloat((cartPriceText ?? '').replace('$', ''));
    console.log(`[Journey] visual_user cart Backpack price: $${cartPrice}`);

    // Assert: inventory price ≠ cart price (bug is in inventory display)
    expect(invBackpackPrice, 'Inventory price should differ from correct price').not.toBeCloseTo(
      29.99,
      2
    );
    expect(cartPrice, 'Cart price should be correct ($29.99)').toBeCloseTo(29.99, 2);
  });

  /**
   * TC-JOURNEY-VU-02: visual_user broken image is present on inventory
   */
  test('TC-JOURNEY-VU-02: visual_user inventory has at least one broken image @bug @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(
      SAUCE_DEMO_USERS.visual_user.username,
      SAUCE_DEMO_USERS.visual_user.password
    );
    await expect(page).toHaveURL(/inventory\.html/);
    await page.waitForLoadState('networkidle');

    const brokenCount = await page.evaluate(() => {
      const images = Array.from(
        document.querySelectorAll('[data-test="inventory-item-image"]')
      ) as HTMLImageElement[];
      return images.filter(
        (img) => !img.complete || img.naturalWidth === 0 || img.src.includes('sl-404')
      ).length;
    });

    expect(brokenCount, 'visual_user should have at least 1 broken image').toBeGreaterThanOrEqual(
      1
    );
    console.log(`[Journey] visual_user: ${brokenCount} broken image(s) found`);
  });
});

// ==============================================================
// Performance Glitch User — Slow Login Journey
// ==============================================================

test.describe('User Journey — performance_glitch_user (Slow Login)', () => {
  let loginPage: LoginPage;
  let inventoryPage: InventoryPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inventoryPage = new InventoryPage(page);
  });

  test.afterEach(async ({ page }) => {
    if (await inventoryPage.isOnInventoryPage()) {
      await inventoryPage.logout();
    }
  });

  /**
   * TC-JOURNEY-PG-01: performance_glitch_user login is slow but functional
   */
  test('TC-JOURNEY-PG-01: Slow login then full cart workflow functions normally @critical @p0', async ({
    page,
  }) => {
    const start = Date.now();
    await loginPage.navigate();
    await loginPage.login(
      SAUCE_DEMO_USERS.performance_glitch_user.username,
      SAUCE_DEMO_USERS.performance_glitch_user.password
    );
    await page.waitForURL(/inventory\.html/);
    const loginTime = Date.now() - start;

    console.log(`[Journey] performance_glitch_user login time: ${loginTime}ms`);

    // Login should have been slow (>= 2000ms)
    expect(
      loginTime,
      'performance_glitch_user login should be slow (>= 2000ms)'
    ).toBeGreaterThanOrEqual(2000);

    // But everything should work after
    const products = await inventoryPage.getAllProductNames();
    expect(products.length).toBe(6);

    await inventoryPage.addItemToCart(products[0]);
    expect(await inventoryPage.getCartBadgeCount()).toBe(1);
    console.log(`[Journey] performance_glitch_user: Full workflow works despite slow login`);
  });
});

// ==============================================================
// Cross-User Comparison: Inventory Price Accuracy
// ==============================================================

test.describe('Cross-User Comparison — Inventory Price Accuracy', () => {
  const usersWhoCanLogin = [
    { key: 'standard_user', shouldHaveCorrectPrices: true },
    { key: 'problem_user', shouldHaveCorrectPrices: true },
    { key: 'error_user', shouldHaveCorrectPrices: true },
    { key: 'visual_user', shouldHaveCorrectPrices: false }, // BUG-003b
    { key: 'performance_glitch_user', shouldHaveCorrectPrices: true },
  ] as const;

  for (const { key, shouldHaveCorrectPrices } of usersWhoCanLogin) {
    test(`Price Accuracy: ${key} (expected correct: ${shouldHaveCorrectPrices}) @critical @p0`, async ({
      page,
    }) => {
      const user = SAUCE_DEMO_USERS[key];
      const loginPage = new LoginPage(page);
      const inventoryPage = new InventoryPage(page);

      await loginPage.navigate();
      await loginPage.login(user.username, user.password);
      await page.waitForURL(/inventory\.html/);

      const productNames = await inventoryPage.getAllProductNames();
      const displayedPrices = await inventoryPage.getAllProductPrices();

      let wrongPriceCount = 0;
      for (let i = 0; i < productNames.length; i++) {
        const expected = KNOWN_PRODUCT_PRICES[productNames[i]];
        if (expected && Math.abs(displayedPrices[i] - expected) > 0.01) {
          wrongPriceCount++;
          console.log(
            `[PriceCompare] ${key} — ${productNames[i]}: $${displayedPrices[i]} (expected: $${expected})`
          );
        }
      }

      if (shouldHaveCorrectPrices) {
        expect(wrongPriceCount, `${key} should have correct inventory prices`).toBe(0);
      } else {
        // visual_user is expected to have wrong prices
        expect(
          wrongPriceCount,
          `${key} is expected to have wrong inventory prices`
        ).toBeGreaterThan(0);
      }
    });
  }
});
