/**
 * supported-users.ts
 * Complete test user definitions for all 6 SauceDemo user types
 * Includes expected behavior, bug exposure, and assertion values for bug verification
 *
 * Usage:
 *   import { SAUCE_DEMO_USERS } from '../test-data/supported-users';
 *   const { problem_user } = SAUCE_DEMO_USERS;
 */

export interface SauceDemoUser {
  username: string;
  password: string;
  displayName: string;
  description: string;
  /** Whether login is expected to succeed */
  loginShouldSucceed: boolean;
  /** Bug(s) this user type exposes */
  exposedBugs: string[];
  /** Expected checkout subtotal for single item (Sauce Labs Backpack, id: 4) */
  expectedSingleItemSubtotal?: number;
  /** Known incorrect price shown on inventory page for this user */
  knownIncorrectPrices?: Record<string, number>;
  /** Expected correct prices (for comparison against visual_user display) */
  expectedCorrectPrices?: Record<string, number>;
  /** Performance: expected minimum login time in ms (for performance_glitch_user) */
  expectedMinLoginTimeMs?: number;
  /** Error message expected on product detail page (for error_user) */
  expectedProductDetailError?: string;
}

export const SAUCE_DEMO_USERS: Record<string, SauceDemoUser> = {
  standard_user: {
    username: 'standard_user',
    password: 'secret_sauce',
    displayName: 'Standard User',
    description: 'Normal happy-path user. No known bugs.',
    loginShouldSucceed: true,
    exposedBugs: [],
    expectedSingleItemSubtotal: 29.99,
  },

  problem_user: {
    username: 'problem_user',
    password: 'secret_sauce',
    displayName: 'Problem User',
    description:
      'Login succeeds but UI/page logic has bugs. ' +
      'BUG EXPOSED: Checkout overview doubles item prices in subtotal calculation. ' +
      'When 1 item at $29.99 is in cart, checkout overview shows $59.98 instead of $29.99. ' +
      'Tax is also doubled ($2.40 correct vs $4.80 shown). Total is wrong accordingly.',
    loginShouldSucceed: true,
    exposedBugs: ['BUG-001'],
    // Single item (Sauce Labs Backpack) should be $29.99
    expectedSingleItemSubtotal: 29.99,
  },

  error_user: {
    username: 'error_user',
    password: 'secret_sauce',
    displayName: 'Error User',
    description:
      'Login succeeds but product detail page renders an error message instead of description. ' +
      'BUG EXPOSED: Product detail page shows "A description should be here, ' +
      'but it failed to render! This error has been reported to Backtrace." ' +
      'instead of the actual product description.',
    loginShouldSucceed: true,
    exposedBugs: ['BUG-002'],
    expectedProductDetailError:
      'A description should be here, but it failed to render! This error has been reported to Backtrace.',
  },

  visual_user: {
    username: 'visual_user',
    password: 'secret_sauce',
    displayName: 'Visual User',
    description:
      'Login succeeds but has visual defects. ' +
      'BUG EXPOSED (BUG-003a): Broken image on Sauce Labs Backpack (sl-404.jpg). ' +
      'BUG EXPOSED (BUG-003b): Wrong prices displayed on inventory page ' +
      '(e.g., $27.25 instead of $29.99, $50.20 instead of $9.99). ' +
      'Note: Cart and checkout prices are CORRECT — bug is inventory display only.',
    loginShouldSucceed: true,
    exposedBugs: ['BUG-003a', 'BUG-003b'],
    // Known incorrect display prices on inventory page for visual_user
    // Key = product name, Value = incorrect displayed price
    knownIncorrectPrices: {
      'Sauce Labs Backpack': 27.25, // Should be $29.99
      // Additional wrong prices may appear for other items
    },
    // Correct expected prices (cart/checkout shows these correctly)
    expectedCorrectPrices: {
      'Sauce Labs Backpack': 29.99,
      'Sauce Labs Bolt T-Shirt': 15.99,
      'Sauce Labs Onesie': 7.99,
      'Test.allTheThings() T-Shirt (Red)': 15.99,
      'Sauce Labs Bike Light': 9.99,
      'Sauce Labs Fleece Jacket': 49.99,
    },
  },

  performance_glitch_user: {
    username: 'performance_glitch_user',
    password: 'secret_sauce',
    displayName: 'Performance Glitch User',
    description:
      'Login succeeds but experiences an intentional 2-second delay during login. ' +
      'BUG EXPOSED (BUG-004): Slow login — 2 second delay added intentionally as part of ' +
      'user persona behavior testing. Page still functions normally after login.',
    loginShouldSucceed: true,
    exposedBugs: ['BUG-004'],
    // The intentional delay is ~2000ms, so min expected time is ~2000ms
    // We set a threshold that would fail if delay were > 5s (catching regression)
    expectedMinLoginTimeMs: 2000,
  },

  locked_out_user: {
    username: 'locked_out_user',
    password: 'secret_sauce',
    displayName: 'Locked Out User',
    description:
      'Login is correctly blocked. ' +
      'BUG EXPOSED (BUG-005): N/A — this is CORRECT expected behavior. ' +
      'User should see: "Sorry, this user has been locked out. ' +
      'You cannot see this e-commerce site unless you and your browser are authenticated."',
    loginShouldSucceed: false,
    exposedBugs: [],
  },
};

/**
 * Helper: Get all user types as array
 */
export function getAllUserTypes(): SauceDemoUser[] {
  return Object.values(SAUCE_DEMO_USERS);
}

/**
 * Helper: Get user by key
 */
export function getUser(key: keyof typeof SAUCE_DEMO_USERS): SauceDemoUser {
  return SAUCE_DEMO_USERS[key];
}

/**
 * Known SauceDemo product prices (ground truth)
 * Used to verify visual_user display bug
 */
export const KNOWN_PRODUCT_PRICES: Record<string, number> = {
  'Sauce Labs Backpack': 29.99,
  'Sauce Labs Bolt T-Shirt': 15.99,
  'Sauce Labs Onesie': 7.99,
  'Test.allTheThings() T-Shirt (Red)': 15.99,
  'Sauce Labs Bike Light': 9.99,
  'Sauce Labs Fleece Jacket': 49.99,
};

/**
 * Tax rate used by SauceDemo (8% = 0.08)
 * Used to verify tax calculation in checkout overview
 */
export const TAX_RATE = 0.08;

/**
 * Calculate expected tax from subtotal
 */
export function calculateExpectedTax(subtotal: number): number {
  return Math.round(subtotal * TAX_RATE * 100) / 100;
}

/**
 * Calculate expected total from subtotal
 */
export function calculateExpectedTotal(subtotal: number): number {
  const tax = calculateExpectedTax(subtotal);
  return Math.round((subtotal + tax) * 100) / 100;
}
