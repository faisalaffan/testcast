# TestCast E2E Automation - Test Plan Document

---

## 1. Test Plan Document Header

| Field | Value |
|-------|-------|
| **Project** | TestCast E2E Automation |
| **Version** | 1.0 |
| **Date** | 2026-04-11 |
| **Author** | Faisal |
| **Document Status** | Draft |

### 1.1 Objective

This test suite automates end-to-end functional testing for the SauceDemo e-commerce web application (https://www.saucedemo.com/). It validates critical user workflows including authentication, product browsing, cart management, and checkout processes to ensure the application functions correctly across multiple browsers and provides a reliable user experience. The suite is designed to catch regressions early, improve test coverage, and serve as living documentation of expected behavior.

---

## 2. Test Strategy

### 2.1 Scope

#### 2.1.1 In Scope

- **Login Flow**: Authentication with valid credentials, invalid credentials, and locked-out user scenarios
- **Product Browsing**: Product listing page, product detail information, sorting functionality
- **Cart Management**: Adding/removing items, cart quantity adjustments, cart persistence
- **Checkout Flow**: Buyer information form, order summary review, order completion
- **Cross-browser Testing**: Chrome, Firefox, WebKit on desktop (1024x768 minimum viewport)
- **UI Navigation**: Page navigation, back/forward browser navigation, URL validation

#### 2.1.2 Out of Scope

- API-level testing (no direct API calls)
- Performance testing (load time, stress testing)
- Mobile-specific device testing (native mobile app testing)
- Visual regression testing (screenshot comparison)
- Security penetration testing
- Database state validation
- Multi-user concurrency testing

### 2.2 Test Approach

#### 2.2.1 Methodology

**Risk-Based Testing**: Test cases are prioritized based on business criticality and the likelihood of failure. High-risk flows (authentication, checkout) receive the most thorough coverage, while lower-risk flows (social links, about page) are covered at a basic level.

#### 2.2.2 Framework

| Component | Technology | Purpose |
|-----------|------------|---------|
| Test Runner | Playwright Test | Orchestrates test execution, parallel runs, and reporting |
| Language | TypeScript 5.0+ | Type-safe, maintainable test code |
| Assertions | Playwright Expect | Built-in assertion library with auto-waiting |
| Reporter | Playwright HTML Reporter | Visual HTML report with screenshots, videos, traces |
| Package Manager | npm | Dependency management and script execution |

#### 2.2.3 Pattern: Page Object Model (POM)

The test suite follows the **Page Object Model** design pattern to abstract page-specific UI interactions from test logic. This separation provides:

- **Reusability**: Locators and methods defined once, used across multiple tests
- **Maintainability**: UI changes require updates in one location (page classes) only
- **Readability**: Test code focuses on business logic, not DOM manipulation
- **Scalability**: Easy to add new test cases without duplicating UI code

```
e2e-playwright/
  pages/
    LoginPage.ts         # Login page interactions
    InventoryPage.ts     # Product listing interactions
    CartPage.ts          # Shopping cart interactions
    CheckoutPage.ts      # Checkout form interactions
    CheckoutOverviewPage.ts
    CheckoutCompletePage.ts
  tests/
    login.spec.ts
    inventory.spec.ts
    cart.spec.ts
    checkout.spec.ts
  fixtures/
    users.json           # Test data for user accounts
    products.json         # Product catalog data
  config/
    base.config.ts       # Shared configuration
```

#### 2.2.4 Test Data Management

Test data is managed through **JSON fixture files** located in the `fixtures/` directory. This approach ensures:

- **Separation of concerns**: Test logic is decoupled from test data
- **Data reusability**: Same data used across multiple test cases
- **Easy updates**: Data changes don't require code modifications
- **Environment flexibility**: Different fixture files for different environments

### 2.3 Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| **Flaky locators** (dynamic IDs, changing attributes) | Medium | High | Prioritize semantic locators: `getByRole()`, `getByLabel()`, `getByText()`. Fall back to `data-testid` attributes when semantic options are unavailable. Avoid brittle selectors like XPath with indices. |
| **Race conditions** (async UI updates, animations) | Medium | Medium | All assertions use Playwright's auto-waiting. Explicit `expect()` waits for element states (`toBeVisible()`, `toBeEnabled()`). No arbitrary `sleep()` calls. |
| **Auth session expiry** during long test runs | Low | High | Each test requiring authentication performs a fresh login. No shared session state between tests. Use `test.beforeEach()` hook for login setup. |
| **UI changes** (frequent application updates) | High | Medium | POM abstraction layer isolates UI changes to page classes. One change in page class propagates to all tests automatically. Review locator strategy quarterly. |
| **Checkout state dependency** on cart content | Medium | High | Each checkout test independently adds products to cart. No shared cart state. Use test isolation via `test.describe.serial()` only when sequential steps are required. |
| **Network latency** affecting page load assertions | Low | Low | Configured timeout values (default 30s) with sensible fallbacks. Playwright's `waitForLoadState()` handles page readiness. |
| **Multi-browser inconsistencies** | Low | Medium | Core functionality validated against Chromium. Firefox/WebKit receive same test suite with browser-specific locator adjustments as needed. |

---

## 3. Test Cases

### 3.1 Test Case Summary

| TC-ID | Test Case Name | Feature | Type | Priority | Status |
|-------|---------------|---------|------|----------|--------|
| TC-001 | Login with Valid Credentials | Authentication | Positive | P1 | Ready |
| TC-002 | Login with Invalid Credentials | Authentication | Negative | P1 | Ready |
| TC-003 | Login with Locked-Out User | Authentication | Negative | P1 | Ready |
| TC-004 | Add Products to Cart | Cart Management | Positive | P1 | Ready |
| TC-005 | Remove Product from Cart | Cart Management | Positive | P2 | Ready |
| TC-006 | Complete Checkout Flow | Checkout | Positive | P1 | Ready |
| TC-007 | Product Sorting Functionality | Product Browsing | Positive | P2 | Ready |

---

### TC-001: Login with Valid Credentials

| Field | Value |
|-------|-------|
| **TC-ID** | TC-001 |
| **Test Case Name** | Login with Valid Credentials |
| **Feature** | Authentication |
| **Test Type** | Positive |
| **Priority** | P1 |
| **Status** | Ready |

**Objective**: Verify that a user with valid credentials can successfully log in to the SauceDemo application and is redirected to the inventory page.

**Prerequisites**: None (user is logged out by default)

**Test Data**:
```json
{
  "username": "standard_user",
  "password": "secret_sauce"
}
```

**Pre-conditions**:
- User is on the SauceDemo login page (https://www.saucedemo.com/)
- No active session exists

**Test Steps**:

1. Navigate to `https://www.saucedemo.com/`
2. Verify the login form is displayed
3. Enter `standard_user` in the username field
4. Enter `secret_sauce` in the password field
5. Click the **Login** button
6. Wait for URL to change and verify it contains `/inventory.html`
7. Verify the "Products" heading is displayed on the inventory page
8. Verify the shopping cart icon is visible in the header

**Expected Result**: 
- User is successfully authenticated
- Browser URL changes from `/` to `/inventory.html`
- The inventory page displays with "Products" heading
- No error messages are displayed

**Pass Criteria**:
- [ ] URL contains `/inventory.html`
- [ ] "Products" heading element is visible
- [ ] No `.error-message` elements are displayed
- [ ] Cart icon is visible in the navigation header
- [ ] No console errors (Error level) during page load

**Risk Level**: Critical - Core authentication flow; blocks all downstream functionality.

---

### TC-002: Login with Invalid Credentials

| Field | Value |
|-------|-------|
| **TC-ID** | TC-002 |
| **Test Case Name** | Login with Invalid Credentials |
| **Feature** | Authentication |
| **Test Type** | Negative |
| **Priority** | P1 |
| **Status** | Ready |

**Objective**: Verify that the application properly rejects login attempts with invalid username/password combinations and displays an appropriate error message.

**Prerequisites**: None

**Test Data**:
```json
{
  "username": "invalid_user",
  "password": "wrong_password"
}
```

**Pre-conditions**:
- User is on the SauceDemo login page
- No active session exists

**Test Steps**:

1. Navigate to `https://www.saucedemo.com/`
2. Enter `invalid_user` in the username field
3. Enter `wrong_password` in the password field
4. Click the **Login** button
5. Wait for error message to appear
6. Verify the error message container is visible
7. Verify the error message text contains "Username and password do not match"
8. Verify the user remains on the login page (URL is still `/`)
9. Verify the login form fields retain their values

**Expected Result**:
- Login is rejected with HTTP 200 (no server error)
- Error message is displayed indicating authentication failure
- User remains on the login page
- Username and password fields are cleared (security best practice) or retained for retry

**Pass Criteria**:
- [ ] Error message container is visible
- [ ] Error message text is displayed
- [ ] URL remains at `/` (no redirect to inventory)
- [ ] Login form is still accessible for retry

**Risk Level**: Medium - Affects user experience and security perception.

---

### TC-003: Login with Locked-Out User

| Field | Value |
|-------|-------|
| **TC-ID** | TC-003 |
| **Test Case Name** | Login with Locked-Out User |
| **Feature** | Authentication |
| **Test Type** | Negative |
| **Priority** | P1 |
| **Status** | Ready |

**Objective**: Verify that a locked-out user receives a clear error message and cannot access the application, even with correct credentials.

**Prerequisites**: None

**Test Data**:
```json
{
  "username": "locked_out_user",
  "password": "secret_sauce"
}
```

**Pre-conditions**:
- User account `locked_out_user` exists but is locked out
- User is on the SauceDemo login page

**Test Steps**:

1. Navigate to `https://www.saucedemo.com/`
2. Enter `locked_out_user` in the username field
3. Enter `secret_sauce` in the password field
4. Click the **Login** button
5. Wait for error message to appear
6. Verify the error message container is visible
7. Verify the error message text contains "locked out"
8. Verify the user remains on the login page
9. Attempt to navigate directly to `/inventory.html` and verify access is denied (redirected to login)

**Expected Result**:
- Locked-out user cannot authenticate
- Clear error message is displayed mentioning the account is locked
- User is not redirected to the inventory page
- Direct URL access to protected pages is blocked

**Pass Criteria**:
- [ ] Error message is visible on failed login attempt
- [ ] Error message mentions account lockout
- [ ] URL remains at `/`
- [ ] Direct navigation to `/inventory.html` redirects back to `/`

**Risk Level**: Medium - Security feature; important for demonstrating edge case handling.

---

### TC-004: Add Products to Cart

| Field | Value |
|-------|-------|
| **TC-ID** | TC-004 |
| **Test Case Name** | Add Products to Cart |
| **Feature** | Cart Management |
| **Test Type** | Positive |
| **Priority** | P1 |
| **Status** | Ready |

**Objective**: Verify that users can add multiple products to the shopping cart from the product listing page and the cart accurately reflects the selected items.

**Prerequisites**: User must be logged in (complete TC-001 first)

**Test Data**:
```json
{
  "username": "standard_user",
  "password": "secret_sauce",
  "products": [
    { "name": "Sauce Labs Backpack", "price": "$29.99" },
    { "name": "Sauce Labs Bike Light", "price": "$9.99" }
  ]
}
```

**Pre-conditions**:
- User is logged in and on the inventory page (`/inventory.html`)
- Shopping cart is empty

**Test Steps**:

1. Complete login with `standard_user` / `secret_sauce`
2. Verify inventory page loads with product list
3. Click the **Add to Cart** button for "Sauce Labs Backpack"
4. Verify the button changes to "Remove" (text updated)
5. Verify cart badge shows "1"
6. Click the **Add to Cart** button for "Sauce Labs Bike Light"
7. Verify cart badge shows "2"
8. Click the **Shopping Cart** icon in the header
9. Verify cart page displays both products
10. Verify product names match the added items
11. Verify product prices are displayed correctly
12. Verify total number of items in cart is 2

**Expected Result**:
- Both products are added to cart successfully
- Cart badge counter increments correctly (1 -> 2)
- "Add to Cart" button changes to "Remove" for added items
- Cart page displays all added products with correct names and prices
- Cart persists the items (can navigate away and return)

**Pass Criteria**:
- [ ] Cart badge shows correct count after adding items
- [ ] Cart page displays all added products
- [ ] Product names on cart page match selected products
- [ ] Product prices are displayed
- [ ] Add to Cart button state changes to Remove
- [ ] Cart state persists after page navigation

**Risk Level**: Critical - Core shopping flow; affects revenue.

---

### TC-005: Remove Product from Cart

| Field | Value |
|-------|-------|
| **TC-ID** | TC-005 |
| **Test Case Name** | Remove Product from Cart |
| **Feature** | Cart Management |
| **Test Type** | Positive |
| **Priority** | P2 |
| **Status** | Ready |

**Objective**: Verify that users can remove products from the shopping cart and the cart total updates correctly after removal.

**Prerequisites**: User must be logged in; cart must contain at least one product

**Test Data**:
```json
{
  "username": "standard_user",
  "password": "secret_sauce",
  "initial_products": ["Sauce Labs Backpack", "Sauce Labs Bolt T-Shirt"],
  "product_to_remove": "Sauce Labs Backpack"
}
```

**Pre-conditions**:
- User is logged in
- Shopping cart contains exactly 2 items

**Test Steps**:

1. Complete login with `standard_user` / `secret_sauce`
2. Add "Sauce Labs Backpack" to cart
3. Add "Sauce Labs Bolt T-Shirt" to cart
4. Verify cart badge shows "2"
5. Navigate to cart page by clicking cart icon
6. Verify both products are in the cart
7. Click the **Remove** button for "Sauce Labs Backpack"
8. Verify the product is removed from the cart list
9. Verify cart badge updates to "1"
10. Verify "Sauce Labs Bolt T-Shirt" remains in the cart
11. Verify cart total/price reflects remaining item only

**Expected Result**:
- Removed product disappears from cart immediately
- Cart badge decrements correctly (2 -> 1)
- Remaining product is still displayed
- No console errors occur during removal
- Cart persists updated state correctly

**Pass Criteria**:
- [ ] Cart badge decrements after removal
- [ ] Removed product is not displayed in cart list
- [ ] Remaining products are still displayed correctly
- [ ] "Remove" button changes back to "Add to Cart" on inventory page
- [ ] No console errors during removal

**Risk Level**: Medium - Common user action; important for user experience.

---

### TC-006: Complete Checkout Flow

| Field | Value |
|-------|-------|
| **TC-ID** | TC-006 |
| **Test Case Name** | Complete Checkout Flow |
| **Feature** | Checkout |
| **Test Type** | Positive |
| **Priority** | P1 |
| **Status** | Ready |

**Objective**: Verify that a user can complete the entire checkout process from cart to order confirmation, including entering shipping and payment information.

**Prerequisites**: User must be logged in; cart must contain at least one product

**Test Data**:
```json
{
  "username": "standard_user",
  "password": "secret_sauce",
  "checkout_info": {
    "first_name": "Faisal",
    "last_name": "Affan",
    "postal_code": "94016"
  },
  "product": "Sauce Labs Backpack"
}
```

**Pre-conditions**:
- User is logged in
- "Sauce Labs Backpack" is added to cart

**Test Steps**:

1. Complete login with `standard_user` / `secret_sauce`
2. Add "Sauce Labs Backpack" to cart
3. Navigate to cart page
4. Verify product is in cart
5. Click the **Checkout** button
6. Verify checkout step-1 page loads (Your Information)
7. Enter "Faisal" in the First Name field
8. Enter "Affan" in the Last Name field
9. Enter "94016" in the Postal Code field
10. Click the **Continue** button
11. Verify checkout step-2 page loads (Overview)
12. Verify product name is displayed in the item list
13. Verify subtotal, tax, and total are calculated correctly
14. Verify "Finish" button is visible
15. Click the **Finish** button
16. Verify checkout complete page loads
17. Verify success message is displayed: "Thank you for your order!"
18. Verify "Back Home" button is visible
19. Click "Back Home" and verify return to inventory page

**Expected Result**:
- All checkout steps complete without errors
- Order confirmation is displayed
- Cart is cleared after successful order
- User can return to shopping after order completion

**Pass Criteria**:
- [ ] Checkout step 1 accepts valid form data
- [ ] Checkout step 2 displays correct order summary
- [ ] Price calculation is accurate (subtotal + tax = total)
- [ ] Order confirmation message is displayed
- [ ] Cart is empty after order completion
- [ ] "Back Home" returns user to inventory page
- [ ] No console errors during checkout

**Risk Level**: Critical - Core purchase flow; highest business impact.

---

### TC-007: Product Sorting Functionality

| Field | Value |
|-------|-------|
| **TC-ID** | TC-007 |
| **Test Case Name** | Product Sorting Functionality |
| **Feature** | Product Browsing |
| **Test Type** | Positive |
| **Priority** | P2 |
| **Status** | Ready |

**Objective**: Verify that the product sorting dropdown functions correctly for all available sort options (Name A-Z, Name Z-A, Price Low-High, Price High-Low).

**Prerequisites**: User must be logged in

**Test Data**:
```json
{
  "username": "standard_user",
  "password": "secret_sauce"
}
```

**Pre-conditions**:
- User is logged in and on the inventory page
- Products are loaded (default sort is Name A-Z)

**Test Steps**:

1. Complete login with `standard_user` / `secret_sauce`
2. Verify the inventory page displays products
3. Locate the **Sort Products** dropdown (value: "az" initially)
4. Select **Name (Z to A)** from the dropdown
5. Verify products are reordered (Z to A)
6. Verify the dropdown value is "za"
7. Select **Price (Low to High)** from the dropdown
8. Verify products are reordered by ascending price
9. Verify the dropdown value is "lohi"
10. Select **Price (High to Low)** from the dropdown
11. Verify products are reordered by descending price
12. Verify the dropdown value is "hilo"
13. Verify all products are still visible (no products disappeared)

**Expected Result**:
- Each sort option correctly reorders the product list
- Sort preference is visually indicated in the dropdown
- All products remain visible after sorting (no data loss)
- Sorting is instantaneous (no page reload required)

**Pass Criteria**:
- [ ] "Name (Z to A)" sorts products in reverse alphabetical order
- [ ] "Price (Low to High)" sorts products by ascending price
- [ ] "Price (High to Low)" sorts products by descending price
- [ ] All products are present after each sort operation
- [ ] Dropdown indicator reflects current sort selection
- [ ] No console errors during sorting

**Risk Level**: Medium - User experience feature; affects product discoverability.

---

## 4. Test Execution Schedule

### 4.1 Execution Order

Tests are organized by dependency and priority to enable efficient parallel execution:

| Phase | Test Cases | Dependency | Execution Mode |
|-------|------------|------------|----------------|
| **Phase 1** | TC-001, TC-002, TC-003 | None (login flow) | Parallel |
| **Phase 2** | TC-004, TC-005 | Requires TC-001 (authenticated) | Sequential (cart operations) |
| **Phase 3** | TC-006 | Requires TC-004 (cart with items) | Sequential |
| **Phase 4** | TC-007 | Requires TC-001 (authenticated) | Independent |

### 4.2 Estimated Execution Time

| Test Case | Estimated Time | Notes |
|-----------|---------------|-------|
| TC-001 | 8-12 seconds | Login + page load |
| TC-002 | 5-8 seconds | Negative test, faster |
| TC-003 | 5-8 seconds | Negative test, faster |
| TC-004 | 15-20 seconds | Multiple UI interactions |
| TC-005 | 12-15 seconds | Add items + remove |
| TC-006 | 20-30 seconds | Multi-step checkout |
| TC-007 | 10-15 seconds | Multiple sort operations |

### 4.3 Total Suite Execution Time

| Metric | Sequential | Parallel (3 workers) |
|--------|-----------|----------------------|
| **Estimated Total** | 75-108 seconds | 35-50 seconds |
| **With Setup Overhead** | ~2 minutes | ~1.5 minutes |

---

## 5. Reporting

### 5.1 Reporter Configuration

**Primary Reporter**: Playwright HTML Reporter (built-in)

The Playwright HTML Reporter provides a comprehensive, shareable HTML report with:
- Test suite summary with pass/fail counts
- Individual test case results with steps
- Screenshots captured on failure
- Video recordings on failure
- Trace viewer links for failed tests
- Execution timing for each test

### 5.2 Report Artifacts

| Artifact | Trigger Condition | Location | Purpose |
|----------|------------------|----------|---------|
| **Screenshot** | On test failure | `playwright-report/screenshots/` | Visual debugging |
| **Video** | On test failure | `playwright-report/videos/` | Step-by-step playback |
| **Trace** | On test failure | `playwright-report/trace/` | Network and DOM inspection |
| **Console Logs** | Always captured | Embedded in HTML report | JS error identification |
| **HTML Report** | After each run | `playwright-report/index.html` | Shareable results |

### 5.3 Report Artifacts Location

```
e2e-playwright/
  playwright-report/
    index.html              # Main HTML report
    screenshots/           # Failure screenshots
    videos/                # Failure video recordings
    trace/                 # Trace archives
    data/                  # JSON test data
```

---

## 6. Environment

### 6.1 Test Environment

| Parameter | Value |
|-----------|-------|
| **Application URL** | https://www.saucedemo.com/ |
| **Environment Type** | Production (live site) |
| **API Base URL** | N/A (UI-only testing) |

### 6.2 Browser Coverage

| Browser | Version Constraint | Headless Support | Notes |
|---------|-------------------|------------------|-------|
| **Chromium** | Latest stable | Yes | Primary browser for development |
| **Firefox** | Latest stable | Yes | Cross-browser validation |
| **WebKit** | Latest stable | Yes | macOS/Safari simulation |

### 6.3 Device Coverage

| Device | Viewport | Mode | Priority |
|--------|----------|------|----------|
| **Desktop (Standard)** | 1280x720 | Both | Primary |
| **Desktop (Minimum)** | 1024x768 | Both | Minimum supported |
| **Tablet** | 768x1024 | Responsive | Secondary |

### 6.4 Test Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
```

---

## 7. Tools & Technologies

| Tool | Version | Purpose |
|------|---------|---------|
| **Playwright** | 1.40+ | End-to-end automation framework; handles browser automation, locators, assertions, and reporting |
| **TypeScript** | 5.0+ | Type-safe JavaScript superset; catches type errors at compile time, improves maintainability |
| **Node.js** | 18+ | JavaScript runtime; required for Playwright execution and npm package management |
| **npm** | 9+ | Package manager; handles dependency installation and script execution |
| **Playwright Test** | (included) | Official test runner built into Playwright; supports parallel execution, fixtures, hooks |
| **Playwright CLI** | (included) | Command-line interface; enables `npx playwright test`, `codegen`, `show-report` |
| **ESLint** | 8+ | Linter; enforces code quality and catches potential issues in test code |
| **Prettier** | 3+ | Code formatter; ensures consistent code style across the test suite |

---

## 8. Appendix

### 8.1 Test Data Reference

| Data File | Location | Contents |
|-----------|----------|----------|
| Users | `fixtures/users.json` | Valid, invalid, and locked-out user credentials |
| Products | `fixtures/products.json` | Product catalog with names, descriptions, and prices |
| Checkout | `fixtures/checkout.json` | Valid checkout form data |

**Example: `fixtures/users.json`**
```json
{
  "users": [
    {
      "id": "standard",
      "username": "standard_user",
      "password": "secret_sauce",
      "type": "valid"
    },
    {
      "id": "locked",
      "username": "locked_out_user",
      "password": "secret_sauce",
      "type": "locked"
    },
    {
      "id": "problem",
      "username": "problem_user",
      "password": "secret_sauce",
      "type": "problem"
    }
  ]
}
```

### 8.2 Page Object Reference

| Page Class | File | Responsibilities |
|-----------|------|-----------------|
| LoginPage | `pages/LoginPage.ts` | Login form interactions, error message retrieval |
| InventoryPage | `pages/InventoryPage.ts` | Product listing, sorting, add/remove from cart |
| CartPage | `pages/CartPage.ts` | Cart item listing, quantity adjustment, checkout initiation |
| CheckoutPage | `pages/CheckoutPage.ts` | Buyer information form, form validation |
| CheckoutOverviewPage | `pages/CheckoutOverviewPage.ts` | Order summary, tax calculation, finish checkout |
| CheckoutCompletePage | `pages/CheckoutCompletePage.ts` | Order confirmation, back-to-shop navigation |

### 8.3 Known Issues & Limitations

| Issue ID | Description | Workaround | Severity |
|----------|-------------|------------|----------|
| KNOWN-001 | `problem_user` has visual issues with product images on inventory page | Use `standard_user` for most tests | Low |
| KNOWN-002 | No explicit logout functionality in UI | Browser session reset between tests | Low |
| KNOWN-003 | Checkout does not collect real payment | N/A - test environment only | Info |
| KNOWN-004 | Performance not measured | Out of scope for this suite | Info |

### 8.4 Glossary

| Term | Definition |
|------|------------|
| **POM** | Page Object Model - Design pattern for organizing UI automation code |
| **Locator** | Playwright's mechanism for finding HTML elements (CSS, XPath, semantic) |
| **Fixture** | Test data files used to parameterize tests |
| **Hook** | `beforeEach`, `afterEach` functions that run before/after tests |
| **E2E** | End-to-End - Testing from the user's perspective |
| **CI/CD** | Continuous Integration/Continuous Deployment pipeline |

---

*Document generated: 2026-04-11*
*Last updated: 2026-04-11*
*Version: 1.0*
