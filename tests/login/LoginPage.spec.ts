import { expect, test } from '../../fixtures/traced-steps';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import users from '../../test-data/users.json';

const VALID_USER = users.validUsers[0];
const INVALID_USERS = users.invalidUsers;

test.describe('Login Suite - TC-001 to TC-004', () => {
  let loginPage: LoginPage;
  let inventoryPage: InventoryPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inventoryPage = new InventoryPage(page);
    await loginPage.navigate();
  });

  test.afterEach(async ({ page }) => {
    if (await inventoryPage.isOnInventoryPage()) {
      await inventoryPage.logout();
    }
  });

  /**
   * TC-001: Login with valid credentials
   * AC: User is redirected to inventory page and cart badge is visible
   */
  test('TC-001: Login with valid credentials redirects to inventory page @critical @smoke @p0', async ({
    page,
  }) => {
    await test.step('Enter credentials', async () => {
      await loginPage.login(VALID_USER.username, VALID_USER.password);
    });

    await test.step('Verify redirected to inventory', async () => {
      await expect(page).toHaveURL(/\/inventory\.html/);
    });

    await test.step('Verify inventory page elements', async () => {
      await expect(inventoryPage.sortDropdown).toBeVisible();
      await expect(inventoryPage.cartLink).toBeVisible();
      await expect(inventoryPage.inventoryItems.first()).toBeVisible();
    });

    console.log(`[TC-001] Successfully logged in as ${VALID_USER.username}`);
  });

  /**
   * TC-002: Login with wrong password
   * AC: Error message is displayed indicating credentials mismatch
   */
  test('TC-002: Login with wrong password shows error message @smoke @critical @p0', async ({
    page,
  }) => {
    const invalidUser = INVALID_USERS[0];

    await test.step('Enter wrong credentials', async () => {
      await loginPage.login(invalidUser.username, invalidUser.password);
    });

    await test.step('Verify error message shown', async () => {
      await expect(loginPage.errorMessage).toBeVisible();
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).toContain('do not match');
    });

    await test.step('Verify still on login page', async () => {
      await expect(page).toHaveURL('https://www.saucedemo.com/');
    });

    console.log(`[TC-002] Error displayed for wrong password`);
  });

  /**
   * TC-003: Login with empty username
   * AC: Error message is displayed indicating username is required
   */
  test('TC-003: Login with empty username shows error message @p1', async ({ page }) => {
    const invalidUser = INVALID_USERS[1];

    await test.step('Try login with empty username', async () => {
      await loginPage.login(invalidUser.username, invalidUser.password);
    });

    await test.step('Verify error message shown', async () => {
      await expect(loginPage.errorMessage).toBeVisible();
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).toContain('Username is required');
    });

    await test.step('Verify still on login page', async () => {
      await expect(page).toHaveURL('https://www.saucedemo.com/');
    });

    console.log(`[TC-003] Error displayed for empty username`);
  });

  /**
   * TC-004: Login with locked_out_user
   * AC: Appropriate error message is shown
   */
  test('TC-004: Login with locked_out_user shows locked out error @p1', async ({ page }) => {
    const lockedOutUser = INVALID_USERS[2];

    await test.step('Try login with locked user', async () => {
      await loginPage.login(lockedOutUser.username, lockedOutUser.password);
    });

    await test.step('Verify locked out error shown', async () => {
      await expect(loginPage.errorMessage).toBeVisible();
      const errorText = await loginPage.getErrorMessage();
      expect(errorText.toLowerCase()).toContain('locked');
    });

    await test.step('Verify still on login page', async () => {
      await expect(page).toHaveURL('https://www.saucedemo.com/');
    });

    console.log(`[TC-004] Locked out user error displayed`);
  });
});
