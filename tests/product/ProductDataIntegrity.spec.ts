/**
 * ProductDataIntegrity.spec.ts
 *
 * SUITE 3: Product Data Integrity Tests (P0)
 *
 * Purpose: Verify all product data (images, descriptions, names, prices)
 * is correct and properly displayed across all pages.
 *
 * Bug Coverage:
 * - BUG-002 (error_user): Product detail shows error message instead of description
 * - BUG-003a (visual_user): Broken image (sl-404.jpg returns 404)
 *
 * Test Cases:
 * - TC-PROD-001: All 6 products have valid images
 * - TC-PROD-002: error_user product detail shows render error (BUG-002)
 * - TC-PROD-003: visual_user has broken image (BUG-003a)
 * - TC-PROD-004: Product descriptions are present and non-empty
 * - TC-PROD-005: Product names match expected values
 * - TC-PROD-006: All products have valid prices (non-zero, positive)
 * - TC-PROD-007: Product sorting works correctly
 *
 * Coverage: All 6 products, all user types with data integrity issues
 */

import { expect, test } from '../../fixtures/traced-steps';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import { ProductDetailPage } from '../../pages/ProductDetailPage';
import { SAUCE_DEMO_USERS } from '../../test-data/supported-users';

const { standard_user, error_user, visual_user } = SAUCE_DEMO_USERS;

const ALL_PRODUCTS = [
  'Sauce Labs Backpack',
  'Sauce Labs Bolt T-Shirt',
  'Sauce Labs Onesie',
  'Test.allTheThings() T-Shirt (Red)',
  'Sauce Labs Bike Light',
  'Sauce Labs Fleece Jacket',
];

test.describe('SUITE 3: Product Data Integrity Tests', () => {
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
   * TC-PROD-001: All 6 products have valid (non-broken) images
   * AC: All product images load successfully with non-zero dimensions
   */
  test('TC-PROD-001: All products have valid images for standard_user @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const brokenImages = await page.evaluate(() => {
      const images = Array.from(
        document.querySelectorAll('[data-test="inventory-item-image"]')
      ) as HTMLImageElement[];
      const broken: string[] = [];

      images.forEach((img, idx) => {
        const parent = img.closest('[data-test="inventory-item"]');
        const name =
          parent?.querySelector('[data-test="inventory-item-name"]')?.textContent ?? `Item ${idx}`;
        const isBroken = !img.complete || img.naturalWidth === 0 || img.src.includes('404');
        if (isBroken) {
          broken.push(`${name}: src=${img.src.substring(img.src.lastIndexOf('/') + 1)}`);
        }
      });

      return broken;
    });

    console.log(`[TC-PROD-001] Broken images: ${brokenImages.length}`);
    brokenImages.forEach((img) => console.log(`[TC-PROD-001]   ${img}`));

    expect(brokenImages.length, 'standard_user should have no broken images').toBe(0);
  });

  /**
   * TC-PROD-002: error_user product detail shows render error (BUG-002)
   * AC: Product detail page displays error message instead of description
   */
  test('TC-PROD-002: error_user product detail shows render error (BUG-002) @bug', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Click on a product to view detail
    const productNames = await inventoryPage.getAllProductNames();
    const targetProduct = productNames[0];

    await inventoryPage.addItemToCart(targetProduct);

    // Navigate to product detail (click on the product name/link)
    const productLink = page.locator('[data-test="inventory-item-name"]').first();
    await productLink.click();

    await expect(page).toHaveURL(/inventory-item\.html/);
    await page.waitForLoadState('networkidle');

    // Check for render error
    const hasError = await productDetailPage.isRenderErrorVisible();
    const description = await productDetailPage.getDescription();

    console.log(`[TC-PROD-002] Render error visible: ${hasError}`);
    console.log(`[TC-PROD-002] Description: "${description.substring(0, 80)}..."`);

    // Assert bug is present
    expect(
      hasError || description.includes('failed to render'),
      'BUG-002: error_user should show render error'
    ).toBe(true);
  });

  /**
   * TC-PROD-003: visual_user has broken image (BUG-003a)
   * AC: At least one product image is broken (404 or 0x0 dimensions)
   */
  test('TC-PROD-003: visual_user has broken image (BUG-003a) @bug', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await page.waitForLoadState('networkidle');

    const brokenImages = await page.evaluate(() => {
      const images = Array.from(
        document.querySelectorAll('[data-test="inventory-item-image"]')
      ) as HTMLImageElement[];
      const broken: string[] = [];

      images.forEach((img, idx) => {
        const parent = img.closest('[data-test="inventory-item"]');
        const name =
          parent?.querySelector('[data-test="inventory-item-name"]')?.textContent ?? `Item ${idx}`;
        const isBroken =
          !img.complete ||
          img.naturalWidth === 0 ||
          img.src.includes('sl-404') ||
          img.src.includes('404');
        if (isBroken) {
          broken.push(`${name}: src=${img.src.substring(img.src.lastIndexOf('/') + 1)}`);
        }
      });

      return broken;
    });

    console.log(`[TC-PROD-003] Broken images for visual_user: ${brokenImages.length}`);
    brokenImages.forEach((img) => console.log(`[TC-PROD-003]   ${img}`));

    // Assert bug is present
    expect(
      brokenImages.length,
      'BUG-003a: visual_user should have at least 1 broken image'
    ).toBeGreaterThanOrEqual(1);
  });

  /**
   * TC-PROD-004: Product descriptions are present and non-empty
   * AC: All products have descriptions (except error_user which shows error)
   */
  test('TC-PROD-004: All products have non-empty descriptions for standard_user @p1', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productNames = await inventoryPage.getAllProductNames();

    for (const productName of productNames) {
      // Click on product to view detail
      const productLink = page.locator(
        `[data-test="inventory-item-name"]:has-text("${productName}")`
      );
      await productLink.click();

      await expect(page).toHaveURL(/inventory-item\.html/);

      const description = await productDetailPage.getDescription();
      console.log(`[TC-PROD-004] ${productName}: "${description.substring(0, 50)}..."`);

      expect(
        description.length,
        `${productName} should have non-empty description`
      ).toBeGreaterThan(10);

      // Go back
      await productDetailPage.backToProducts();
      await expect(page).toHaveURL(/inventory\.html/);
    }
  });

  /**
   * TC-PROD-005: Product names match expected values
   * AC: All product names are exactly as expected
   */
  test('TC-PROD-005: All product names match expected values @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productNames = await inventoryPage.getAllProductNames();
    console.log(`[TC-PROD-005] Found ${productNames.length} products`);

    // Should have exactly 6 products
    expect(productNames.length).toBe(6);

    // All expected products should be present
    for (const expectedProduct of ALL_PRODUCTS) {
      const found = productNames.some((n) => n === expectedProduct);
      expect(found, `Product "${expectedProduct}" should be present`).toBe(true);
    }
  });

  /**
   * TC-PROD-006: All products have valid prices (non-zero, positive)
   * AC: All displayed prices are greater than 0
   */
  test('TC-PROD-006: All products have valid positive prices @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productNames = await inventoryPage.getAllProductNames();
    const prices = await inventoryPage.getAllProductPrices();

    for (let i = 0; i < productNames.length; i++) {
      const price = prices[i];
      console.log(`[TC-PROD-006] ${productNames[i]}: $${price}`);
      expect(price, `${productNames[i]} should have positive price`).toBeGreaterThan(0);
    }
  });

  /**
   * TC-PROD-007: Product sorting works correctly (lohi)
   * AC: Products sorted by price ascending
   */
  test('TC-PROD-007: Products sorted by price low to high @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Get prices before sorting
    const pricesBefore = await inventoryPage.getAllProductPrices();
    console.log(`[TC-PROD-007] Prices before sort: $${pricesBefore.join(', $')}`);

    // Apply sort
    await inventoryPage.selectSortOption('lohi');

    // Get prices after sorting
    const pricesAfter = await inventoryPage.getAllProductPrices();
    console.log(`[TC-PROD-007] Prices after sort: $${pricesAfter.join(', $')}`);

    // Verify ascending order
    for (let i = 0; i < pricesAfter.length - 1; i++) {
      expect(
        pricesAfter[i],
        `Price at index ${i} should be <= price at index ${i + 1}`
      ).toBeLessThanOrEqual(pricesAfter[i + 1]);
    }
  });

  /**
   * TC-PROD-008: Product sorting (hilo) works correctly
   * AC: Products sorted by price descending
   */
  test('TC-PROD-008: Products sorted by price high to low @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Apply sort
    await inventoryPage.selectSortOption('hilo');

    // Get prices after sorting
    const pricesAfter = await inventoryPage.getAllProductPrices();
    console.log(`[TC-PROD-008] Prices after hilo sort: $${pricesAfter.join(', $')}`);

    // Verify descending order
    for (let i = 0; i < pricesAfter.length - 1; i++) {
      expect(
        pricesAfter[i],
        `Price at index ${i} should be >= price at index ${i + 1}`
      ).toBeGreaterThanOrEqual(pricesAfter[i + 1]);
    }
  });

  /**
   * TC-PROD-009: error_user has render error on ALL products
   * AC: All product details show error for error_user
   */
  test('TC-PROD-009: error_user shows render error on all product details (BUG-002)', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productNames = await inventoryPage.getAllProductNames();
    let errorCount = 0;

    for (const productName of productNames) {
      // Click on product to view detail
      const productLink = page.locator(
        `[data-test="inventory-item-name"]:has-text("${productName}")`
      );
      await productLink.click();

      await expect(page).toHaveURL(/inventory-item\.html/);

      const hasError = await productDetailPage.isRenderErrorVisible();
      if (hasError) errorCount++;

      // Go back
      await productDetailPage.backToProducts();
      await expect(page).toHaveURL(/inventory\.html/);
    }

    console.log(`[TC-PROD-009] Products with render error: ${errorCount}/${productNames.length}`);
    expect(errorCount, 'BUG-002: error_user should show render error on all products').toBe(
      productNames.length
    );
  });

  /**
   * TC-PROD-010: visual_user broken image is specifically sl-404.jpg
   * AC: Sauce Labs Backpack image returns 404
   */
  test('TC-PROD-010: visual_user backpack image is sl-404.jpg (BUG-003a)', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Check first product (Backpack) image
    const backpackImageInfo = await page.evaluate(() => {
      const firstItem = document.querySelector('[data-test="inventory-item"]');
      const img = firstItem?.querySelector(
        '[data-test="inventory-item-image"]'
      ) as HTMLImageElement | null;
      const name =
        firstItem?.querySelector('[data-test="inventory-item-name"]')?.textContent ?? 'Unknown';

      return {
        name,
        src: img?.src ?? '',
        is404: img?.src.includes('sl-404') ?? false,
        complete: img?.complete ?? false,
        naturalWidth: img?.naturalWidth ?? 0,
      };
    });

    console.log(`[TC-PROD-010] Backpack image:`, backpackImageInfo);

    // Assert bug is present
    expect(
      backpackImageInfo.is404 || backpackImageInfo.naturalWidth === 0,
      'BUG-003a: Backpack image should be broken (sl-404 or 0 naturalWidth)'
    ).toBe(true);
  });
});
