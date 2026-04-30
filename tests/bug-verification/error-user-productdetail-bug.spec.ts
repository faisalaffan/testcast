/**
 * error-user-productdetail-bug.spec.ts
 *
 * BUG-002: error_user — Product Detail Page Render Error
 *
 * Bug Description:
 *   When error_user navigates to a product detail page (by clicking a product
 *   name or image from the inventory list), the product description area
 *   shows an error message instead of the actual product description:
 *
 *   "A description should be here, but it failed to render!
 *    This error has been reported to Backtrace."
 *
 *   This is an application-level rendering error, not a test assertion failure.
 *
 * AC:
 *   AC-001: Login with error_user succeeds
 *   AC-002: Product list (inventory) is visible and shows all 6 items
 *   AC-003: Clicking a product navigates to product detail page
 *   AC-004: Product detail page for error_user shows the "failed to render" error
 *           instead of the actual product description (BUG)
 *   AC-005: Product name and price are still displayed correctly (only description broken)
 *   AC-006: "Add to Cart" button is functional on the product detail page
 */

import { expect, test } from '../../fixtures/traced-steps';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import { ProductDetailPage } from '../../pages/ProductDetailPage';
import { KNOWN_PRODUCT_PRICES, SAUCE_DEMO_USERS } from '../../test-data/supported-users';

const { error_user } = SAUCE_DEMO_USERS;
const TARGET_PRODUCT = 'Sauce Labs Backpack';
const EXPECTED_PRICE = KNOWN_PRODUCT_PRICES[TARGET_PRODUCT]; // $29.99
const EXPECTED_ERROR_TEXT =
  /A description should be here, but it failed to render! This error has been reported to Backtrace\./i;

test.describe('BUG-002: error_user — Product Detail Page Render Error', () => {
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
   * TC-BUG-002-01: error_user login succeeds (AC-001)
   */
  test('TC-BUG-002-01: error_user can login successfully @bug @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.inventoryItems.first()).toBeVisible();
    console.log(`[BUG-002] error_user logged in successfully`);
  });

  /**
   * TC-BUG-002-02: Product list shows all 6 items (AC-002)
   */
  test('TC-BUG-002-02: error_user sees all 6 products in inventory @bug @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productNames = await inventoryPage.getAllProductNames();
    expect(productNames.length).toBe(6);
    expect(productNames).toContain(TARGET_PRODUCT);
    console.log(`[BUG-002] error_user sees ${productNames.length} products in inventory`);
  });

  /**
   * TC-BUG-002-03: Clicking a product navigates to product detail (AC-003)
   */
  test('TC-BUG-002-03: Clicking product name navigates to product detail page @bug @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Click on the Sauce Labs Backpack product name link
    const productLink = page.locator('[data-test="inventory-item-name"]', {
      hasText: TARGET_PRODUCT,
    });
    await productLink.click();

    // Should navigate to product detail URL (contains inventory-item)
    await expect(page).toHaveURL(/inventory-item/);
    console.log(`[BUG-002] Navigated to product detail: ${page.url()}`);
  });

  /**
   * TC-BUG-002-04: Product detail page shows "failed to render" error (AC-004)
   *
   * BUG VERIFICATION:
   *   PASSES if description text matches EXPECTED_ERROR_TEXT
   *   FAILS  if description text shows the actual product description ← AFTER FIX
   *
   * This test asserts the BUG IS present (description shows error text).
   * When the bug is fixed, the assertion will fail — which is the expected behavior.
   */
  test('TC-BUG-002-04: Product detail description shows render error @bug @p2', async ({
    page,
  }, testInfo) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Navigate to product detail
    const productLink = page.locator('[data-test="inventory-item-name"]', {
      hasText: TARGET_PRODUCT,
    });
    await productLink.click();
    await expect(page).toHaveURL(/inventory-item/);

    // Wait for page to fully render
    await page.waitForLoadState('domcontentloaded');

    // Get the description text
    const description = await productDetailPage.getDescription();
    console.log(`[BUG-002] Product description text: "${description}"`);

    // Attach evidence
    await testInfo.attach('BUG-002-product-detail', {
      contentType: 'image/png',
      body: await page.screenshot({ fullPage: false }),
    });
    await testInfo.attach('BUG-002-description-text', {
      contentType: 'text/plain',
      body: description,
    });

    // BUG: description contains the error message
    const hasRenderError = EXPECTED_ERROR_TEXT.test(description);
    console.log(`[BUG-002] Has render error: ${hasRenderError}`);

    // Assert the bug IS present (will fail when bug is fixed)
    expect(
      description,
      'BUG-002: Description should show "failed to render" error for error_user'
    ).toMatch(EXPECTED_ERROR_TEXT);
  });

  /**
   * TC-BUG-002-05: Product name and price are displayed correctly (AC-005)
   *
   * The bug only affects the description. Name and price should be fine.
   */
  test('TC-BUG-002-05: Product name and price are displayed correctly despite description bug @bug @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productLink = page.locator('[data-test="inventory-item-name"]', {
      hasText: TARGET_PRODUCT,
    });
    await productLink.click();
    await expect(page).toHaveURL(/inventory-item/);

    // Verify product name is correct
    const displayedName = await productDetailPage.getProductName();
    expect(displayedName).toBe(TARGET_PRODUCT);
    console.log(`[BUG-002] Product name correct: "${displayedName}"`);

    // Verify price is correct
    const displayedPrice = await productDetailPage.getPrice();
    expect(displayedPrice).toBeCloseTo(EXPECTED_PRICE, 2);
    console.log(
      `[BUG-002] Product price correct: $${displayedPrice} (expected: $${EXPECTED_PRICE})`
    );
  });

  /**
   * TC-BUG-002-06: Add to Cart button is functional on product detail (AC-006)
   *
   * Even though description is broken, add-to-cart should still work.
   */
  test('TC-BUG-002-06: Add to Cart button works on product detail page @bug @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productLink = page.locator('[data-test="inventory-item-name"]', {
      hasText: TARGET_PRODUCT,
    });
    await productLink.click();
    await expect(page).toHaveURL(/inventory-item/);

    // Verify Add to Cart button is visible and clickable
    await expect(productDetailPage.addToCartButton).toBeVisible();
    await productDetailPage.addToCart();

    // Verify button changed to "Remove" after adding
    await expect(productDetailPage.removeButton).toBeVisible();
    console.log(`[BUG-002] Add to Cart works despite description render error`);
  });

  /**
   * TC-BUG-002-07: Verify render error exists on all products for error_user
   *
   * The bug should affect all product detail pages, not just Sauce Labs Backpack.
   */
  test('TC-BUG-002-07: Render error appears on all product detail pages @bug @p2', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productNames = await inventoryPage.getAllProductNames();

    for (const productName of productNames) {
      // Click on the product
      const productLink = page.locator('[data-test="inventory-item-name"]', {
        hasText: productName,
      });
      await productLink.click();
      await expect(page).toHaveURL(/inventory-item/);
      await page.waitForLoadState('domcontentloaded');

      // Check description
      const description = await productDetailPage.getDescription();
      const hasError = EXPECTED_ERROR_TEXT.test(description);

      console.log(`[BUG-002] "${productName}" — render error present: ${hasError}`);

      // Assert bug is present
      expect(description, `BUG-002: "${productName}" should show render error`).toMatch(
        EXPECTED_ERROR_TEXT
      );

      // Navigate back to inventory
      await productDetailPage.backToProducts();
      await expect(page).toHaveURL(/inventory\.html/);
    }
  });

  /**
   * TC-BUG-002-08: Full bug report with evidence for BUG-002
   */
  test('TC-BUG-002-08: Document full bug evidence for BUG-002 @bug @p2', async ({
    page,
  }, testInfo) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productLink = page.locator('[data-test="inventory-item-name"]', {
      hasText: TARGET_PRODUCT,
    });
    await productLink.click();
    await expect(page).toHaveURL(/inventory-item/);
    await page.waitForLoadState('networkidle');

    const bugData = {
      bugId: 'BUG-002',
      user: error_user.username,
      product: TARGET_PRODUCT,
      productUrl: page.url(),
      descriptionText: await productDetailPage.getDescription(),
      productName: await productDetailPage.getProductName(),
      productPrice: await productDetailPage.getPrice(),
      expectedErrorText:
        'A description should be here, but it failed to render! This error has been reported to Backtrace.',
      hasRenderError: EXPECTED_ERROR_TEXT.test(await productDetailPage.getDescription()),
      bugDescription:
        'Product detail page for error_user shows render error instead of actual description. ' +
        'Name and price display correctly; only description field is broken.',
    };

    console.log('[BUG-002] Bug Report:', JSON.stringify(bugData, null, 2));

    await testInfo.attach('BUG-002-evidence', {
      contentType: 'application/json',
      body: JSON.stringify(bugData, null, 2),
    });
    await testInfo.attach('BUG-002-product-detail-page', {
      contentType: 'image/png',
      body: await page.screenshot({ fullPage: true }),
    });
  });
});
