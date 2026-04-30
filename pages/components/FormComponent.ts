import type { Page } from '@playwright/test';

export class FormComponent {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async fillTextField(selector: string, value: string): Promise<void> {
    await this.page.locator(selector).fill(value);
  }

  async clickButton(selector: string): Promise<void> {
    await this.page.locator(selector).click();
  }

  async getInputValue(selector: string): Promise<string> {
    return (await this.page.locator(selector).inputValue()) ?? '';
  }

  async isButtonEnabled(selector: string): Promise<boolean> {
    return this.page
      .locator(selector)
      .isEnabled()
      .catch(() => false);
  }
}
