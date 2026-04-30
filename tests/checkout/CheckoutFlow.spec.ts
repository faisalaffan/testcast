import { expect, test } from '../../fixtures/traced-steps';
import { CartPage } from '../../pages/CartPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import users from '../../test-data/users.json';

const VALID_USER = users.validUsers[0];

test.describe('Inventory Suite - TC-005 to TC-006', () => {
  let loginPage: LoginPage;
  let inventoryPage: InventoryPage;
  let cartPage: CartPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inventoryPage = new InventoryPage(page);
    cartPage = new CartPage(page);

    // Login before each test
    await loginPage.navigate();
    await loginPage.login(VALID_USER.username, VALID_USER.password);
    await expect(page).toHaveURL(/.*\/inventory.html/);
  });

  test.afterEach(async ({ page }) => {
    if (await inventoryPage.isOnInventoryPage()) {
      await inventoryPage.logout();
    }
  });

  /**
   * TC-005: Product sorting - price low to high
   * AC: Products are displayed sorted from lowest to highest price
   */
  test('TC-005: Products are sorted by price low to high @p1', async ({ page }) => {
    await test.step('Capture initial product prices', async () => {
      const pricesBefore = await inventoryPage.getAllProductPrices();
      expect(pricesBefore.length).toBeGreaterThan(0);
    });

    await test.step('Apply price sort low to high', async () => {
      await inventoryPage.selectSortOption('lohi');
    });

    await test.step('Verify prices are sorted ascending', async () => {
      const pricesAfter = await inventoryPage.getAllProductPrices();
      for (let i = 0; i < pricesAfter.length - 1; i++) {
        expect(pricesAfter[i]).toBeLessThanOrEqual(pricesAfter[i + 1]);
      }
    });

    console.log(`[TC-005] Price sorting verified`);
  });

  /**
   * TC-006: Add product to cart
   * AC: Cart badge shows correct count and item appears in cart
   */
  test('TC-006: Adding product to cart updates badge and cart page @p1', async ({ page }) => {
    await test.step('Get product list', async () => {
      const productNames = await inventoryPage.getAllProductNames();
      expect(productNames.length).toBeGreaterThan(0);
    });

    await test.step('Verify initial cart is empty', async () => {
      const initialCount = await inventoryPage.getCartBadgeCount();
      expect(initialCount).toBe(0);
    });

    await test.step('Add first product to cart', async () => {
      const productNames = await inventoryPage.getAllProductNames();
      const targetProduct = productNames[0];
      await inventoryPage.addItemToCart(targetProduct);
      const updatedCount = await inventoryPage.getCartBadgeCount();
      expect(updatedCount).toBe(1);
    });

    await test.step('Navigate to cart', async () => {
      await inventoryPage.clickCart();
      await expect(page).toHaveURL(/.*\/cart.html/);
    });

    await test.step('Verify item in cart', async () => {
      const cartItemNames = await cartPage.getCartItemNames();
      expect(cartItemNames.length).toBe(1);
      const cartCount = await cartPage.getCartItemCount();
      expect(cartCount).toBe(1);
    });

    console.log(`[TC-006] Product added to cart successfully`);
  });
});
