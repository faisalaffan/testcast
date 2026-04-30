import type { Page } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async waitForUrl(pattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(pattern);
  }

  async waitForSelector(
    selector: string,
    options?: { state?: 'visible' | 'hidden' | 'attached' | 'detached' }
  ): Promise<void> {
    await this.page.waitForSelector(selector, options as any);
  }

  async isVisible(selector: string): Promise<boolean> {
    return this.page
      .locator(selector)
      .isVisible()
      .catch(() => false);
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }
}
