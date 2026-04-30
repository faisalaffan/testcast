import { type Page, test as base } from '@playwright/test';

/**
 * Custom test fixture that auto-captures screenshot at every test.step()
 * Screenshots are embedded directly in Playwright HTML report
 *
 * Fixes applied:
 * - No global state (uses 'this' context from extended test)
 * - Proper TypeScript generics for step return type
 * - Error handling for screenshot failures
 * - Hash-based step name suffix to prevent collision
 */
const testExt = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await use(page);
  },
});

// Override step on the extended test object
// Use 'this' context to access page fixture - no global state needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(testExt as any).step = async function <T>(
  this: { page: Page },
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  // Capture page from fixture context via 'this'
  const page = this.page;

  // Call original step with proper 'this' context
  return base.step(name, async () => {
    // Execute the step function first
    const result = await fn();

    // Then capture screenshot - screenshot after step for visual confirmation
    const info = testExt.info();
    if (info && page) {
      const screenshot = await page.screenshot({ fullPage: false }).catch(() => null); // Don't fail step if screenshot fails

      if (screenshot) {
        // Sanitize step name and add hash suffix for uniqueness
        const hashSuffix = name
          .split('')
          .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
        const stepName = `${name
          .replace(/[^a-zA-Z0-9]/g, '-')
          .substring(0, 45)}-${Math.abs(hashSuffix) % 10000}`;

        await info.attach(`step-${stepName}`, {
          body: screenshot,
          contentType: 'image/png',
        });
      }
    }

    return result;
  }) as Promise<T>;
};

export const test = testExt;
export { expect } from '@playwright/test';
