/**
 * visual-user-bugs.spec.ts
 *
 * BUG-003: visual_user — Broken Image + Wrong Display Prices
 *
 * Bug Description (two separate bugs):
 *
 * BUG-003a — Broken Image:
 *   Sauce Labs Backpack image is broken (sl-404.jpg returns 404).
 *   The image element exists but has 0x0 dimensions or fails to load.
 *
 * BUG-003b — Wrong Display Prices on Inventory Page:
 *   Inventory page shows incorrect prices for some/all products
 *   (e.g., $27.25 instead of $29.99, $50.20 instead of $9.99).
 *   IMPORTANT: Cart and Checkout pages show CORRECT prices — only the
 *   inventory listing page has wrong display prices.
 *
 * Products with known wrong prices for visual_user:
 *   - Sauce Labs Backpack: shown as $27.25 (correct: $29.99)
 *   - Other products may also display incorrectly
 *
 * AC:
 *   AC-001: Login with visual_user succeeds
 *   AC-002: Inventory page shows 6 products (no missing items)
 *   AC-003: At least one product image is broken (BUG-003a)
 *   AC-004: At least one product has wrong display price on inventory (BUG-003b)
 *   AC-005: Cart page prices are CORRECT (bug is display-only)
 *   AC-006: Checkout overview prices match cart (consistent correct prices)
 */

import { expect, test } from '../../fixtures/traced-steps';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import { KNOWN_PRODUCT_PRICES, SAUCE_DEMO_USERS } from '../../test-data/supported-users';

const { visual_user } = SAUCE_DEMO_USERS;

test.describe('BUG-003: visual_user — Broken Image + Wrong Display Prices', () => {
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
   * TC-BUG-003-01: visual_user login succeeds (AC-001)
   */
  test('TC-BUG-003-01: visual_user can login successfully @bug @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.inventoryItems.first()).toBeVisible();
    console.log(`[BUG-003] visual_user logged in successfully`);
  });

  /**
   * TC-BUG-003-02: Inventory shows all 6 products (AC-002)
   */
  test('TC-BUG-003-02: visual_user sees all 6 products in inventory @bug @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productNames = await inventoryPage.getAllProductNames();
    expect(productNames.length).toBe(6);
    console.log(`[BUG-003] visual_user sees ${productNames.length} products`);
  });

  // ==============================================================
  // BUG-003a: Broken Image Verification
  // ==============================================================

  /**
   * TC-BUG-003a-01: At least one product image is broken (AC-003)
   *
   * BUG VERIFICATION:
   *   Checks for images with naturalWidth === 0 OR failed load (404).
   *   Sauce Labs Backpack is known to have sl-404.jpg which returns 404.
   */
  test('TC-BUG-003a-01: Broken image exists on inventory page @bug @p2', async ({
    page,
  }, testInfo) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await page.waitForLoadState('networkidle');

    // Screenshot before checking broken images
    await testInfo.attach('BUG-003a-inventory-full', {
      contentType: 'image/png',
      body: await page.screenshot({ fullPage: false }),
    });

    // Count broken images using JS evaluation
    const brokenImageCount = await page.evaluate(() => {
      const images = Array.from(
        document.querySelectorAll('[data-test="inventory-item-image"]')
      ) as HTMLImageElement[];
      let broken = 0;
      const brokenDetails: string[] = [];
      images.forEach((img, index) => {
        const parent = img.closest('[data-test="inventory-item"]');
        const productName =
          parent?.querySelector('[data-test="inventory-item-name"]')?.textContent ??
          `Item ${index}`;
        const isBroken = !img.complete || img.naturalWidth === 0 || img.src.includes('sl-404');
        if (isBroken) {
          broken++;
          brokenDetails.push(
            `${productName}: src=${img.src}, complete=${img.complete}, naturalWidth=${img.naturalWidth}`
          );
        }
      });
      return { brokenCount: broken, details: brokenDetails };
    });

    console.log(`[BUG-003a] Broken images found: ${brokenImageCount.brokenCount}`);
    brokenImageCount.details.forEach((d) => console.log(`[BUG-003a]   ${d}`));

    // Attach broken image evidence
    await testInfo.attach('BUG-003a-broken-image-check', {
      contentType: 'application/json',
      body: JSON.stringify(brokenImageCount, null, 2),
    });

    // Assert bug is present: at least 1 broken image
    expect(
      brokenImageCount.brokenCount,
      'BUG-003a: At least 1 broken image expected for visual_user'
    ).toBeGreaterThanOrEqual(1);
  });

  /**
   * TC-BUG-003a-02: Sauce Labs Backpack image specifically is broken
   *
   * Known broken image: sl-404.jpg (returns 404 HTTP)
   */
  test('TC-BUG-003a-02: Sauce Labs Backpack image is broken (sl-404.jpg) @bug @p2', async ({
    page,
  }, testInfo) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Check the specific backpack image
    const backpackImageBroken = await page.evaluate(() => {
      const backpackItem = document.querySelector('[data-test="inventory-item"]');
      const img = backpackItem?.querySelector(
        '[data-test="inventory-item-image"]'
      ) as HTMLImageElement | null;
      if (!img) return { found: false };
      return {
        found: true,
        src: img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        is404: img.src.includes('sl-404.jpg'),
      };
    });

    console.log(`[BUG-003a] Backpack image:`, backpackImageBroken);

    await testInfo.attach('BUG-003a-backpack-image', {
      contentType: 'image/png',
      body: await page.screenshot({ fullPage: false }),
    });

    // Assert: image is either 404 or has 0 naturalWidth
    const isBroken =
      !backpackImageBroken.found ||
      backpackImageBroken.is404 ||
      backpackImageBroken.naturalWidth === 0;
    expect(isBroken, 'BUG-003a: Backpack image should be broken (sl-404.jpg) for visual_user').toBe(
      true
    );
  });

  // ==============================================================
  // BUG-003b: Wrong Display Prices on Inventory Page
  // ==============================================================

  /**
   * TC-BUG-003b-01: Inventory page shows wrong prices (AC-004)
   *
   * BUG VERIFICATION:
   *   For each product on the inventory page, compare displayed price
   *   against KNOWN_PRODUCT_PRICES. Any mismatch = bug present.
   *
   * Known wrong prices for visual_user:
   *   - Sauce Labs Backpack: $27.25 (correct: $29.99)
   */
  test('TC-BUG-003b-01: Inventory display prices differ from expected prices @bug @p2', async ({
    page,
  }, testInfo) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Get all product names and prices from inventory page
    const productNames = await inventoryPage.getAllProductNames();
    const displayedPrices = await inventoryPage.getAllProductPrices();

    const priceComparison: Array<{
      product: string;
      displayed: number;
      expected: number;
      isWrong: boolean;
      difference: number;
    }> = [];

    for (let i = 0; i < productNames.length; i++) {
      const product = productNames[i];
      const displayed = displayedPrices[i];
      const expected = KNOWN_PRODUCT_PRICES[product] ?? displayed;
      const isWrong = Math.abs(displayed - expected) > 0.01;
      priceComparison.push({
        product,
        displayed,
        expected,
        isWrong,
        difference: displayed - expected,
      });
    }

    console.log(`[BUG-003b] Price comparison for visual_user:`);
    priceComparison.forEach(({ product, displayed, expected, isWrong, difference }) => {
      const status = isWrong ? '❌ WRONG' : '✅ correct';
      console.log(`[BUG-003b]   ${product}: $${displayed} (expected: $${expected}) ${status}`);
    });

    // Attach structured evidence
    await testInfo.attach('BUG-003b-price-comparison', {
      contentType: 'application/json',
      body: JSON.stringify(priceComparison, null, 2),
    });

    // Count wrong prices
    const wrongCount = priceComparison.filter((p) => p.isWrong).length;
    console.log(`[BUG-003b] Products with wrong prices: ${wrongCount}/${priceComparison.length}`);

    // Assert bug is present: at least 1 wrong price
    expect(
      wrongCount,
      'BUG-003b: At least 1 wrong price expected for visual_user on inventory page'
    ).toBeGreaterThanOrEqual(1);
  });

  /**
   * TC-BUG-003b-02: Sauce Labs Backpack shows wrong price $27.25 (AC-004)
   *
   * Known bug: Backpack shows $27.25 instead of $29.99 for visual_user
   */
  test('TC-BUG-003b-02: Sauce Labs Backpack price is $27.25 instead of $29.99 @bug @p2', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Get all products and find the Backpack
    const productNames = await inventoryPage.getAllProductNames();
    const displayedPrices = await inventoryPage.getAllProductPrices();

    const backpackIndex = productNames.findIndex((name) => name === 'Sauce Labs Backpack');
    expect(backpackIndex).not.toBe(-1);

    const displayedPrice = displayedPrices[backpackIndex];
    const expectedPrice = KNOWN_PRODUCT_PRICES['Sauce Labs Backpack']; // $29.99
    const knownBugPrice = 27.25;

    console.log(
      `[BUG-003b] Backpack displayed: $${displayedPrice}, expected: $${expectedPrice}, known-bug: $${knownBugPrice}`
    );

    // Assert the wrong price is shown (bug present)
    expect(
      displayedPrice,
      'BUG-003b: Backpack should show wrong price ($27.25) for visual_user'
    ).toBeCloseTo(knownBugPrice, 2);
    // Also assert it differs from correct price
    expect(
      displayedPrice,
      'BUG-003b: Displayed price should NOT equal correct price ($29.99)'
    ).not.toBeCloseTo(expectedPrice, 2);
  });

  /**
   * TC-BUG-003b-03: Known incorrect price data from bug report (AC-004)
   *
   * Verifies specific known incorrect prices for visual_user match our documented bug.
   */
  test('TC-BUG-003b-03: Known incorrect prices match documented bug values @bug @p2', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    const productNames = await inventoryPage.getAllProductNames();
    const displayedPrices = await inventoryPage.getAllProductPrices();

    // Check known incorrect prices
    const knownIncorrect = visual_user.knownIncorrectPrices ?? {};
    const incorrectFound: string[] = [];
    const incorrectNotFound: string[] = [];

    for (const [productName, incorrectPrice] of Object.entries(knownIncorrect)) {
      const index = productNames.findIndex((n) => n === productName);
      if (index === -1) continue;

      const displayed = displayedPrices[index];
      if (Math.abs(displayed - incorrectPrice) < 0.01) {
        incorrectFound.push(
          `${productName}: $${displayed} (matches known bug price $${incorrectPrice})`
        );
      } else {
        incorrectNotFound.push(
          `${productName}: $${displayed} (expected bug price $${incorrectPrice})`
        );
      }
    }

    console.log(`[BUG-003b] Known incorrect prices found:`);
    incorrectFound.forEach((m) => console.log(`[BUG-003b]   ✅ ${m}`));
    incorrectNotFound.forEach((m) => console.log(`[BUG-003b]   ⚠️  ${m}`));

    // At least the known incorrect prices should match
    expect(
      incorrectFound.length,
      'BUG-003b: Known incorrect prices should match documented bug values'
    ).toBeGreaterThanOrEqual(1);
  });

  // ==============================================================
  // BUG-003b Part 2: Cart Prices Are CORRECT (not affected by bug)
  // ==============================================================

  /**
   * TC-BUG-003c-01: Cart page shows CORRECT prices (AC-005)
   *
   * The price display bug is ONLY on the inventory page.
   * Cart and checkout show correct prices.
   */
  test('TC-BUG-003c-01: Cart page shows correct prices (inventory bug does not affect cart) @bug @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Get inventory displayed price for Sauce Labs Backpack
    const invProductNames = await inventoryPage.getAllProductNames();
    const invPrices = await inventoryPage.getAllProductPrices();
    const backpackIndex = invProductNames.findIndex((n) => n === 'Sauce Labs Backpack');
    const inventoryBackpackPrice = invPrices[backpackIndex];

    // Add backpack to cart
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await expect(page).toHaveURL(/cart\.html/);

    // Get cart item prices
    const cartItemNames = await cartPage.getCartItemNames();
    expect(cartItemNames).toContain('Sauce Labs Backpack');

    // Cart prices should be CORRECT (not affected by visual bug)
    const cartPrice = 29.99; // Correct price
    // Get the price from cart item element
    const cartItemPriceLocator = page.locator('.cart_item .inventory_item_price').first();
    const cartPriceText = await cartItemPriceLocator.textContent();
    const cartPriceValue = Number.parseFloat((cartPriceText ?? '').replace('$', ''));

    console.log(`[BUG-003c] Inventory displayed price: $${inventoryBackpackPrice}`);
    console.log(`[BUG-003c] Cart price: $${cartPriceValue} (correct: $${cartPrice})`);

    // Assert cart price is correct (equals KNOWN_PRODUCT_PRICES, not inventory display)
    expect(
      cartPriceValue,
      'BUG-003c: Cart price should be correct ($29.99) even for visual_user'
    ).toBeCloseTo(cartPrice, 2);

    // Also assert inventory price was wrong (bug is present)
    const expectedCorrect = KNOWN_PRODUCT_PRICES['Sauce Labs Backpack'];
    expect(
      inventoryBackpackPrice,
      'BUG-003b: Inventory price should be wrong for visual_user'
    ).not.toBeCloseTo(expectedCorrect, 2);
  });

  /**
   * TC-BUG-003c-02: Checkout overview prices are correct (AC-006)
   *
   * Verifies that cart → checkout flow preserves correct prices.
   */
  test('TC-BUG-003c-02: Checkout overview shows correct prices (not inventory display prices) @bug @critical @p0', async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);

    // Capture wrong inventory price for verification
    const invPrices = await inventoryPage.getAllProductPrices();
    const invNames = await inventoryPage.getAllProductNames();
    const backpackIndex = invNames.findIndex((n) => n === 'Sauce Labs Backpack');
    const inventoryBackpackPrice = invPrices[backpackIndex];

    // Add item and go to checkout
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    await inventoryPage.clickCart();
    await cartPage.clickCheckout();
    await checkoutPage.fillCheckoutForm({
      firstName: 'Visual',
      lastName: 'Tester',
      postalCode: '90210',
    });
    await checkoutPage.clickContinue();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    // Get cart item prices from checkout (these should be correct)
    const checkoutItemPrices = await checkoutPage.getCartItemPrices();
    const summary = await checkoutPage.getSummaryInfo();

    console.log(`[BUG-003c] Checkout item prices: $${checkoutItemPrices}`);
    console.log(`[BUG-003c] Checkout subtotal: ${summary.subtotalText}`);

    // Cart item prices on checkout should be correct ($29.99)
    expect(checkoutItemPrices[0]).toBeCloseTo(KNOWN_PRODUCT_PRICES['Sauce Labs Backpack'], 2);

    // Subtotal should match correct price, not the wrong inventory display price
    expect(summary.subtotalValue).toBeCloseTo(KNOWN_PRODUCT_PRICES['Sauce Labs Backpack'], 2);
    expect(
      summary.subtotalValue,
      'Checkout subtotal should NOT match wrong inventory price'
    ).not.toBeCloseTo(inventoryBackpackPrice, 2);
  });

  // ==============================================================
  // BUG-003 Documentation
  // ==============================================================

  /**
   * TC-BUG-003-99: Full bug documentation report for BUG-003
   */
  test('TC-BUG-003-99: Document full BUG-003 evidence @bug @p2', async ({ page }, testInfo) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await page.waitForLoadState('networkidle');

    const productNames = await inventoryPage.getAllProductNames();
    const displayedPrices = await inventoryPage.getAllProductPrices();

    const priceComparison = productNames.map((name, i) => ({
      product: name,
      displayed: displayedPrices[i],
      expected: KNOWN_PRODUCT_PRICES[name] ?? displayedPrices[i],
      isWrong:
        Math.abs(displayedPrices[i] - (KNOWN_PRODUCT_PRICES[name] ?? displayedPrices[i])) > 0.01,
    }));

    const brokenImages = await page.evaluate(() => {
      const images = Array.from(
        document.querySelectorAll('[data-test="inventory-item-image"]')
      ) as HTMLImageElement[];
      return images
        .map((img, idx) => {
          const parent = img.closest('[data-test="inventory-item"]');
          const name =
            parent?.querySelector('[data-test="inventory-item-name"]')?.textContent ??
            `Item ${idx}`;
          return {
            name,
            src: img.src,
            broken: !img.complete || img.naturalWidth === 0 || img.src.includes('sl-404'),
          };
        })
        .filter((img) => img.broken);
    });

    const bugData = {
      bugId: 'BUG-003',
      user: visual_user.username,
      bugs: [
        {
          subBugId: 'BUG-003a',
          description: 'Broken image (sl-404.jpg) on Sauce Labs Backpack',
          affectedProducts: brokenImages.map((i) => i.name),
          brokenImageSrcs: brokenImages.map((i) => i.src),
        },
        {
          subBugId: 'BUG-003b',
          description: 'Wrong display prices on inventory page (cart/checkout prices are correct)',
          affectedProducts: priceComparison.filter((p) => p.isWrong),
        },
      ],
      note: 'Cart and checkout pages show correct prices. Only inventory listing page is affected.',
    };

    console.log('[BUG-003] Full Bug Report:', JSON.stringify(bugData, null, 2));

    await testInfo.attach('BUG-003-evidence', {
      contentType: 'application/json',
      body: JSON.stringify(bugData, null, 2),
    });
    await testInfo.attach('BUG-003-inventory-page', {
      contentType: 'image/png',
      body: await page.screenshot({ fullPage: true }),
    });
  });
});
