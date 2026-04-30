import { expect, test } from '../../fixtures/traced-steps';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import users from '../../test-data/users.json';

const VALID_USER = users.validUsers[0];
const CHECKOUT_DATA = users.checkoutUsers[0];

test.describe('Checkout Suite - TC-007', () => {
  let loginPage: LoginPage;
  let inventoryPage: InventoryPage;
  let cartPage: CartPage;
  let checkoutPage: CheckoutPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inventoryPage = new InventoryPage(page);
    cartPage = new CartPage(page);
    checkoutPage = new CheckoutPage(page);

    // Login
    await loginPage.navigate();
    await loginPage.login(VALID_USER.username, VALID_USER.password);
    await expect(page).toHaveURL(/.*\/inventory.html/);
  });

  /**
   * TC-007: Complete checkout flow end-to-end
   * AC: User can complete purchase and see success message
   *
   * Each step will have automatic screenshot captured and embedded in report
   */
  test('TC-007: Complete checkout flow shows success message @critical @smoke @p0', async ({
    page,
  }) => {
    await test.step('Get product list', async () => {
      const productNames = await inventoryPage.getAllProductNames();
      expect(productNames.length).toBeGreaterThan(0);
    });

    await test.step('Add first product to cart', async () => {
      const productNames = await inventoryPage.getAllProductNames();
      const targetProduct = productNames[0];
      await inventoryPage.addItemToCart(targetProduct);
      const badgeCount = await inventoryPage.getCartBadgeCount();
      expect(badgeCount).toBe(1);
    });

    await test.step('Navigate to cart', async () => {
      await inventoryPage.clickCart();
      await expect(page).toHaveURL(/.*\/cart.html/);
      const cartItems = await cartPage.getCartItemCount();
      expect(cartItems).toBe(1);
    });

    await test.step('Click checkout button', async () => {
      await cartPage.clickCheckout();
      await expect(page).toHaveURL(/.*\/checkout-step-one.html/);
    });

    await test.step('Fill checkout form', async () => {
      await checkoutPage.fillCheckoutForm(CHECKOUT_DATA);
      await checkoutPage.clickContinue();
    });

    await test.step('Verify checkout overview', async () => {
      await expect(page).toHaveURL(/.*\/checkout-step-two.html/);
      const summary = await checkoutPage.getSummaryInfo();
      expect(summary.subtotalText).toContain('Item total');
      expect(summary.taxText).toContain('Tax');
      expect(summary.totalText).toContain('Total');
    });

    await test.step('Complete purchase', async () => {
      await checkoutPage.clickFinish();
      await expect(page).toHaveURL(/.*\/checkout-complete.html/);
      const successMessage = await checkoutPage.getSuccessMessage();
      expect(successMessage.toLowerCase()).toContain('thank you for your order');
      await expect(checkoutPage.orderCompleteContainer).toBeVisible();
    });

    // Logout after test
    if (await inventoryPage.isOnInventoryPage()) {
      await inventoryPage.logout();
    }
  });

  /**
   * TC-007b: Checkout with empty fields validation
   */
  test('TC-007b: Checkout with empty fields shows validation error @p1', async ({ page }) => {
    await test.step('Navigate to cart', async () => {
      await inventoryPage.clickCart();
      await cartPage.clickCheckout();
      await expect(page).toHaveURL(/.*\/checkout-step-one.html/);
    });

    await test.step('Try to continue without filling form', async () => {
      await checkoutPage.continueButton.click();
    });

    await test.step('Verify validation error appears', async () => {
      const errorVisible = await page
        .locator('[data-test="error"]')
        .isVisible()
        .catch(() => false);
      if (errorVisible) {
        const errorText = await page.locator('[data-test="error"]').textContent();
        expect(errorText).toBeTruthy();
        console.log(`[TC-007b] Validation error: ${errorText}`);
      } else {
        await expect(checkoutPage.firstNameInput).toBeFocused();
      }
    });

    // Logout after test
    if (await inventoryPage.isOnInventoryPage()) {
      await inventoryPage.logout();
    }
  });
});
