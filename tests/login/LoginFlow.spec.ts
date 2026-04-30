/**
 * LoginFlow.spec.ts
 *
 * SUITE 5: Login Flow Tests (P0)
 *
 * Purpose: Verify login behavior for all 6 user types.
 *
 * Bug Coverage:
 * - BUG-004 (performance_glitch_user): 2-second login delay
 * - BUG-005 (locked_out_user): Correctly locked out
 *
 * Test Cases:
 * - TC-LOGIN-001: standard_user login succeeds
 * - TC-LOGIN-002: locked_out_user login fails
 * - TC-LOGIN-003: problem_user login succeeds
 * - TC-LOGIN-004: error_user login succeeds
 * - TC-LOGIN-005: visual_user login succeeds
 * - TC-LOGIN-006: performance_glitch_user login succeeds (with delay)
 * - TC-LOGIN-007: Performance timing for performance_glitch_user
 * - TC-LOGIN-008: Invalid credentials login fails
 * - TC-LOGIN-009: Empty credentials login fails
 * - TC-LOGIN-010: All 6 users have correct login behavior
 *
 * Coverage: All 6 user types, all login scenarios
 */

import { expect, test } from '../../fixtures/traced-steps';
import { InventoryPage } from '../../pages/InventoryPage';
import { LoginPage } from '../../pages/LoginPage';
import { SAUCE_DEMO_USERS } from '../../test-data/supported-users';

const {
  standard_user,
  locked_out_user,
  problem_user,
  error_user,
  visual_user,
  performance_glitch_user,
} = SAUCE_DEMO_USERS;

test.describe('SUITE 5: Login Flow Tests', () => {
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
   * TC-LOGIN-001: standard_user login succeeds
   * AC: Login with valid credentials succeeds, redirected to inventory
   */
  test('TC-LOGIN-001: standard_user login succeeds @critical @p0', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(standard_user.username, standard_user.password);

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.inventoryItems.first()).toBeVisible();

    console.log(`[TC-LOGIN-001] standard_user logged in successfully`);
  });

  /**
   * TC-LOGIN-002: locked_out_user login fails
   * AC: Login fails with lockout message
   */
  test('TC-LOGIN-002: locked_out_user is correctly locked out @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(locked_out_user.username, locked_out_user.password);

    // Should stay on login page
    await expect(page).not.toHaveURL(/inventory\.html/);

    // Error message should be visible
    const errorMessage = await loginPage.getErrorMessage();
    console.log(`[TC-LOGIN-002] Error message: "${errorMessage}"`);

    expect(errorMessage.toLowerCase()).toContain('locked');
  });

  /**
   * TC-LOGIN-003: problem_user login succeeds
   * AC: Login succeeds despite UI/logic bugs
   */
  test('TC-LOGIN-003: problem_user login succeeds @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(problem_user.username, problem_user.password);

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.inventoryItems.first()).toBeVisible();

    console.log(`[TC-LOGIN-003] problem_user logged in successfully`);
  });

  /**
   * TC-LOGIN-004: error_user login succeeds
   * AC: Login succeeds despite product detail render bugs
   */
  test('TC-LOGIN-004: error_user login succeeds @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(error_user.username, error_user.password);

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.inventoryItems.first()).toBeVisible();

    console.log(`[TC-LOGIN-004] error_user logged in successfully`);
  });

  /**
   * TC-LOGIN-005: visual_user login succeeds
   * AC: Login succeeds despite visual defects
   */
  test('TC-LOGIN-005: visual_user login succeeds @p2', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login(visual_user.username, visual_user.password);

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.inventoryItems.first()).toBeVisible();

    console.log(`[TC-LOGIN-005] visual_user logged in successfully`);
  });

  /**
   * TC-LOGIN-006: performance_glitch_user login succeeds (with delay)
   * AC: Login succeeds despite intentional 2-second delay
   */
  test('TC-LOGIN-006: performance_glitch_user login succeeds with delay @p1', async ({ page }) => {
    const startTime = Date.now();

    await loginPage.navigate();
    await loginPage.login(performance_glitch_user.username, performance_glitch_user.password);

    const endTime = Date.now();
    const duration = endTime - startTime;

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.inventoryItems.first()).toBeVisible();

    console.log(`[TC-LOGIN-006] performance_glitch_user logged in after ${duration}ms`);
  });

  /**
   * TC-LOGIN-007: Performance timing for performance_glitch_user (BUG-004)
   * AC: Login takes at least 2 seconds for performance_glitch_user
   */
  test('TC-LOGIN-007: performance_glitch_user has 2-second login delay (BUG-004) @bug @p2', async ({
    page,
  }) => {
    const startTime = Date.now();

    await loginPage.navigate();
    await loginPage.login(performance_glitch_user.username, performance_glitch_user.password);

    const endTime = Date.now();
    const duration = endTime - startTime;

    await expect(page).toHaveURL(/inventory\.html/);

    console.log(`[TC-LOGIN-007] Login duration: ${duration}ms`);
    console.log(
      `[TC-LOGIN-007] Expected minimum: ~${performance_glitch_user.expectedMinLoginTimeMs ?? 2000}ms`
    );

    // Bug is present: login takes at least 2 seconds
    // This assertion verifies the bug exists
    expect(
      duration,
      'BUG-004: Login should take at least 2 seconds for performance_glitch_user'
    ).toBeGreaterThanOrEqual(performance_glitch_user.expectedMinLoginTimeMs ?? 2000);
  });

  /**
   * TC-LOGIN-008: Invalid credentials login fails
   * AC: Login fails with error message
   */
  test('TC-LOGIN-008: Invalid credentials are rejected @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login('invalid_user', 'wrong_password');

    // Should stay on login page
    await expect(page).not.toHaveURL(/inventory\.html/);

    // Error should be visible
    const errorVisible = await loginPage.isErrorVisible();
    expect(errorVisible).toBe(true);

    const errorMessage = await loginPage.getErrorMessage();
    console.log(`[TC-LOGIN-008] Error for invalid credentials: "${errorMessage}"`);
  });

  /**
   * TC-LOGIN-009: Empty credentials login fails
   * AC: Login fails with error message
   */
  test('TC-LOGIN-009: Empty credentials are rejected @p1', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login('', '');

    // Should stay on login page
    await expect(page).not.toHaveURL(/inventory\.html/);

    // Error should be visible
    const errorVisible = await loginPage.isErrorVisible();
    expect(errorVisible).toBe(true);

    const errorMessage = await loginPage.getErrorMessage();
    console.log(`[TC-LOGIN-009] Error for empty credentials: "${errorMessage}"`);
  });

  /**
   * TC-LOGIN-010: All 6 users have correct login behavior
   * AC: Each user type behaves as expected
   */
  test('TC-LOGIN-010: All 6 users have correct login behavior @critical @p0', async ({ page }) => {
    const users = [
      { user: standard_user, expectSuccess: true },
      { user: locked_out_user, expectSuccess: false },
      { user: problem_user, expectSuccess: true },
      { user: error_user, expectSuccess: true },
      { user: visual_user, expectSuccess: true },
      { user: performance_glitch_user, expectSuccess: true },
    ];

    for (const { user, expectSuccess } of users) {
      await loginPage.navigate();
      await loginPage.login(user.username, user.password);

      if (expectSuccess) {
        await expect(page).toHaveURL(/inventory\.html/, { timeout: 10000 });
        console.log(`[TC-LOGIN-010] ${user.username}: SUCCESS`);
      } else {
        await expect(page).not.toHaveURL(/inventory\.html/);
        const error = await loginPage.getErrorMessage();
        console.log(`[TC-LOGIN-010] ${user.username}: LOCKED OUT - "${error}"`);
      }

      // Logout if logged in
      if (await inventoryPage.isOnInventoryPage()) {
        await inventoryPage.logout();
      }
    }
  });
});
