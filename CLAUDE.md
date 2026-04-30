# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**TestCast — E2E Test Boilerplate** — Comprehensive Playwright + TypeScript end-to-end test automation for [SauceDemo](https://www.saucedemo.com/).

This is a **test assignment project only** — no application code. The target application (SauceDemo) is a public e-commerce demo site hosted at `https://www.saucedemo.com/`.

### Purpose
- Automate 282+ end-to-end tests covering all SauceDemo functionality
- Test across 6 different user types with distinct behaviors
- Verify pricing accuracy, cart operations, checkout flows, and bug regressions
- Generate multi-format reports (HTML, Excel, Allure)

### Technical Stack
- **Framework**: Playwright 1.59 + TypeScript
- **Browser**: Chromium only (desktop)
- **Test Runner**: `@playwright/test`
- **Package Manager**: pnpm
- **Reports**: Playwright HTML, Allure, Excel (custom), JSON

### Target Application
- **URL**: `https://www.saucedemo.com/`
- **Application Under Test**: SauceDemo (public demo e-commerce site)
- **No local server needed** — tests hit the live public site

---

## Project Structure

```
/
├── tests/                    # All test specs (282 tests across 14 suites)
│   ├── smoke/              # P0 smoke tests
│   ├── login/              # Authentication flows
│   ├── inventory/           # Product listing
│   ├── cart/               # Cart operations
│   ├── checkout/           # Checkout flows
│   ├── product/            # Product detail
│   ├── pricing/            # Price accuracy
│   ├── security/           # Auth & session security
│   ├── performance/        # Load & response times
│   ├── exception/          # Error handling
│   ├── negative/           # Invalid input validation
│   ├── boundary/           # Edge value testing
│   ├── corner/            # Extreme combinations
│   ├── integration/       # Multi-page workflows
│   ├── user-journeys/     # Cross-user E2E journeys
│   ├── user-types/        # All 6 user type variations
│   ├── bug-verification/  # Known bug regression
│   ├── helpers/            # Test helpers & demos
│   └── README.md          # Test categorization guide
│
├── pages/                  # Page Object Models
│   ├── LoginPage.ts
│   ├── InventoryPage.ts
│   ├── CartPage.ts
│   ├── CheckoutPage.ts
│   └── ProductDetailPage.ts
│
├── fixtures/              # Playwright fixtures
│   ├── index.ts          # Main fixture exports
│   ├── traced-steps.ts   # Custom test with screenshot step capture
│   ├── auth.fixture.ts    # Auth state fixtures
│   ├── test-data.fixture.ts  # Excel/JSON test data loader
│   └── ...
│
├── test-data/            # Test data
│   ├── supported-users.ts  # 6 user types + KNOWN_PRODUCT_PRICES
│   ├── users.json         # Valid/invalid user credentials
│   └── test-users.xlsx    # Excel data source
│
├── reporters/            # Custom reporters
│   └── excel-reporter.js  # Generates enterprise Excel report
│
├── scripts/             # CI/CD scripts
│   └── s3-teardown.ts   # S3 artifact cleanup
│
├── infra/               # Infrastructure
│   └── k8s/             # Kubernetes configs
│
├── reports/            # Generated test reports
│   ├── playwright-report/  # Playwright HTML report
│   ├── allure-results/     # Allure results
│   └── test-results/       # JSON + Excel results
│
├── tests/README.md      # Test suite organization docs
├── playwright.config.ts # Playwright configuration
├── package.json
└── tsconfig.json
```

---

## Development Commands

### Running Tests
```bash
# All tests (Chromium only)
pnpm test

# Smoke tests only
pnpm test --grep "@smoke"

# Critical tests only
pnpm test --grep "@critical"

# By category
pnpm test tests/smoke/
pnpm test tests/integration/
pnpm test tests/login/

# By tag
pnpm test --grep="@security"
pnpm test --grep="@performance"

# Parallel execution
pnpm test --workers=4

# With retry (CI)
CI=true pnpm test

# List all tests without running
npx playwright test --list
```

### Reports
```bash
# All reports (HTML + Excel + Allure)
make test

# HTML report only
make test-report

# Open HTML report
make show-report

# Open Excel report
make show-excel

# Open Allure report
make show-allure

# Clean all reports
make clean-reports
```

---

## Test Suites (14 Primary + 4 Bug Verification)

| Suite | Name | Tests | Priority |
|-------|------|-------|----------|
| 1 | Login | TC-001–TC-004 | P1 |
| 2 | Cart Operations | 20 tests | P1 |
| 3 | Checkout Flow | 18 tests | P1 |
| 4 | Inventory Page | 15 tests | P1 |
| 5 | Product Detail | 14 tests | P1 |
| 6 | Pricing | 13 tests | P1 |
| 7 | Security | 10 tests | P1 |
| 8 | Performance | 10 tests | P1 |
| 9 | Exception Handling | 15 tests | P1 |
| 10 | Negative Input | 20 tests | P2 |
| 11 | Boundary Values | 14 tests | P2 |
| 12 | Corner Cases | 13 tests | P2 |
| 13 | Full Lifecycle | 15 tests | P0 |
| 14 | User Types | 13 tests | P0 |
| BV-1 | problem_user checkout bug | verification | P2 |
| BV-2 | visual_user price bug | verification | P2 |
| BV-3 | error_user render bug | verification | P2 |
| BV-4 | performance_glitch_user | verification | P2 |

---

## User Types (6 Total)

| User | Behavior | Test Coverage |
|------|----------|---------------|
| `standard_user` | Happy path — all features work | Full checkout flow, pricing |
| `locked_out_user` | Blocked from login | Login error handling |
| `problem_user` | Checkout subtotal doubled (BUG) | Bug verification |
| `error_user` | Product detail render error | Workaround via inventory add |
| `visual_user` | Wrong inventory prices, broken images | Price display bug |
| `performance_glitch_user` | Login takes 2000ms | Performance timing |

---

## Test Tags

| Tag | Purpose |
|-----|---------|
| `@critical` | Must pass for any release (P0) |
| `@smoke` | Quick sanity check (P0) |
| `@integration` | Multi-page workflow (P0-P1) |
| `@bug` | Bug reproduction/regression |
| `@security` | Security-related tests |
| `@performance` | Performance-sensitive tests |

---

## Page Object Model

All page objects live in `pages/` directory and follow this pattern:

```typescript
import { Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput = '#user-name';
  readonly passwordInput = '#password';
  readonly loginButton = '#login-button';
  readonly errorMessage = '.error-message-container';

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('/');
  }

  async login(username: string, password: string) {
    await this.page.fill(this.usernameInput, username);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.loginButton);
  }
}
```

---

## Code Standards

### TypeScript Conventions

#### File Naming
- **Files**: `PascalCase.ts` for page objects, `kebab-case.spec.ts` for test specs
- **Classes**: `PascalCase` (e.g., `LoginPage`, `CheckoutPage`)
- **Methods**: `camelCase` (e.g., `addItemToCart`, `getCartBadgeCount`)

#### Import Paths (critical!)
Files in `tests/` subdirectories (e.g., `tests/boundary/`) import from root-level directories like this:
```typescript
// From tests/boundary/Something.spec.ts (2 levels deep):
import { test, expect } from '../../fixtures/traced-steps';   // ✓ correct
import { LoginPage } from '../../pages/LoginPage';             // ✓ correct
import { SAUCE_DEMO_USERS } from '../../test-data/supported-users';  // ✓ correct

// NOT:
import { test } from '../fixtures/traced-steps';  // ✗ wrong (only 1 level up)
import { test } from 'fixtures/traced-steps';     // ✗ wrong (no relative path)
```

#### Test Spec Structure
```typescript
import { test, expect } from '../../fixtures/traced-steps';
import { LoginPage } from '../../pages/LoginPage';
import { SAUCE_DEMO_USERS } from '../../test-data/supported-users';

test.describe('Suite Name — TC-XXX to TC-YYY', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  /**
   * TC-XXX: Test description
   * AC: Acceptance criteria being verified
   */
  test('TC-XXX: Test title @critical @smoke', async ({ page }) => {
    await loginPage.login('standard_user', 'secret_sauce');
    await expect(page).toHaveURL(/inventory\.html/);
  });
});
```

---

## Test Data

### Supported Users (`test-data/supported-users.ts`)
```typescript
export const SAUCE_DEMO_USERS = {
  standard_user: { username: 'standard_user', password: 'secret_sauce' },
  locked_out_user: { username: 'locked_out_user', password: 'secret_sauce' },
  problem_user: { username: 'problem_user', password: 'secret_sauce' },
  error_user: { username: 'error_user', password: 'secret_sauce' },
  visual_user: { username: 'visual_user', password: 'secret_sauce' },
  performance_glitch_user: { username: 'performance_glitch_user', password: 'secret_sauce' },
};

export const KNOWN_PRODUCT_PRICES: Record<string, number> = {
  'Sauce Labs Backpack': 29.99,
  'Sauce Labs Bike Light': 9.99,
  // ... all 6 products
};

export const TAX_RATE = 0.08;  // 8%

export function calculateExpectedTax(subtotal: number) {
  return Math.round(subtotal * TAX_RATE * 100) / 100;
}

export function calculateExpectedTotal(subtotal: number) {
  return calculateExpectedTax(subtotal) + subtotal;
}
```

---

## Git Workflow

### Branch Naming
```
test/<feature>          # New test features
fix/<bug-description>    # Bug fix tests
chore/<task>            # Maintenance
```

### Commit Message Convention
```
<type>(<scope>): <subject>
```

**Types:**
- `test`: New test or test suite
- `fix`: Test bug fix
- `refactor`: Test restructure
- `chore`: Dependencies, CI/CD

**Examples:**
```
test(login): add TC-004 locked_out_user error
test(checkout): add pricing calculation accuracy
fix(cart): correct import path after restructure
chore(ci): add retry on failure
```

---

## Reports & Artifacts

| Report | Location | Command |
|--------|----------|---------|
| Playwright HTML | `reports/playwright-report/index.html` | `make show-report` |
| Excel | `reports/test-results/excel-report/test-results.xlsx` | `make show-excel` |
| Allure | `reports/allure-results/` | `make show-allure` |
| JSON | `reports/test-results/playwright-json-results.json` | Auto-generated |

---

## Key Files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Test runner config (timeout, retries, reporters) |
| `tests/README.md` | Test categorization and strategy docs |
| `tests/user-journeys/UserJourneys.spec.ts` | Cross-user E2E journeys |
| `fixtures/traced-steps.ts` | Custom test with screenshot-on-step |
| `test-data/supported-users.ts` | 6 user types + known prices + tax |
| `reporters/excel-reporter.js` | Enterprise Excel report generator |

---

## Important Notes

1. **Browser**: Chromium only — no Firefox/WebKit in projects config
2. **Target URL**: All tests hit `https://www.saucedemo.com/` (no local server)
3. **Import paths**: Always `../../` from `tests/<subdirectory>/` to reach root-level dirs
4. **Known bugs**: `problem_user` has doubled subtotal; `visual_user` has wrong prices — these are intentional test targets
5. **Fixture usage**: Use `../../fixtures/traced-steps` not `@playwright/test` directly for custom step screenshot capture
