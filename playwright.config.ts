import * as path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
const envFile = path.resolve(__dirname, '.env');
dotenv.config({ path: envFile });

// Environment configuration
const getBaseUrl = (): string => {
  const env = process.env.NODE_ENV || 'DEV';
  const baseUrls: Record<string, string> = {
    DEV: process.env.BASE_URL_DEV || 'https://www.saucedemo.com',
    STAGING: process.env.BASE_URL_STAGING || 'https://staging.saucedemo.com',
    PROD: process.env.BASE_URL_PROD || 'https://www.saucedemo.com',
  };
  return baseUrls[env] || baseUrls.DEV;
};

// Generate unique test run ID
const generateRunId = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const runNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${dateStr}-${runNum}`;
};

// Tag → Allure Severity mapping
// @p0 → CRITICAL (must-pass gate for any release)
// @p1 → NORMAL (functional/PR gate)
// @p2 → MINOR (edge/boundary, nightly)
type AllureSeverity = 'CRITICAL' | 'NORMAL' | 'MINOR' | 'TRIVIAL' | 'BLOCKER';

function tagToSeverity(testTitle: string): AllureSeverity | undefined {
  const upper = testTitle.toLowerCase();
  if (upper.includes('@p0') || upper.includes('@critical')) return 'CRITICAL';
  if (upper.includes('@p1')) return 'NORMAL';
  if (upper.includes('@p2')) return 'MINOR';
  return undefined;
}

export default defineConfig({
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 3 : undefined,
  globalTeardown: './scripts/s3-teardown.ts',
  reporter: [
    ['html', { open: 'never', outputFolder: 'reports/playwright-report' }],
    ['list'],
    [
      'allure-playwright',
      {
        resultsDir: 'reports/allure-results',
        // Inject Allure severity from test tags (@p0/@p1/@p2)
        resultHook: (result: Record<string, unknown>) => {
          const title = (result.fullName as string) || (result.name as string) || '';
          const severity = tagToSeverity(title);
          if (severity) {
            // Attach severity to result.labels if present, otherwise init labels
            if (!result.labels) result.labels = [];
            const labels = result.labels as Array<Record<string, string>>;
            // Remove any existing severity label
            const existingIdx = labels.findIndex((l) => l.name === 'severity');
            if (existingIdx !== -1) labels.splice(existingIdx, 1);
            labels.push({ name: 'severity', value: severity });
          }
        },
      },
    ],
    ['./reporters/excel-reporter.js', {}],
    ['json', { outputFile: 'reports/test-results/playwright-json-results.json' }],
  ],
  use: {
    // Dynamic base URL from environment
    baseURL: getBaseUrl(),
    screenshot: (process.env.PW_SCREENSHOT as 'on' | 'off' | 'only-on-failure') || 'on',
    video: (process.env.PW_VIDEO as 'on' | 'off' | 'retain-on-failure') || 'off',
    trace: (process.env.PW_TRACE as 'on' | 'off' | 'retain-on-failure') || 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    // Inject test data from environment
    testIdAttribute: 'data-testid',
  },
  /* Our custom settings */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /* Projects */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      outputDir: `reports/test-results/${generateRunId()}`,
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  /* Output */
  outputDir: `reports/test-results/${generateRunId()}`,
});
