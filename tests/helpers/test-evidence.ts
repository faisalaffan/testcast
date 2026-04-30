import type { Page } from '@playwright/test';

/**
 * Captures screenshot and attaches to test report using page.testInfo
 */
export async function attachScreenshot(page: Page, label: string): Promise<void> {
  try {
    const testInfo = (page as any).testInfo;
    if (!testInfo) {
      console.log('testInfo not available, skipping screenshot');
      return;
    }
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach(`Screenshot - ${label}`, {
      body: screenshot,
      contentType: 'image/png',
    });
  } catch (error) {
    console.log(`Failed to capture screenshot: ${error}`);
  }
}

/**
 * Captures screenshot and HTML source for full evidence
 */
export async function attachEvidence(page: Page, label: string): Promise<void> {
  try {
    const testInfo = (page as any).testInfo;
    if (!testInfo) {
      console.log('testInfo not available, skipping evidence attachment');
      return;
    }
    // Capture screenshot
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach(`Screenshot - ${label}`, {
      body: screenshot,
      contentType: 'image/png',
    });

    // Capture page source
    const html = await page.content();
    await testInfo.attach(`HTML Source - ${label}`, {
      body: html,
      contentType: 'text/html',
    });
  } catch (error) {
    console.log(`Failed to capture evidence: ${error}`);
  }
}
