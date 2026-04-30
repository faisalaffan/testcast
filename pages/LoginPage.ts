import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base/BasePage';
import { FormComponent } from './components/FormComponent';

export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly errorCloseButton: Locator;
  readonly form: FormComponent;

  constructor(page: Page) {
    super(page);
    this.form = new FormComponent(page);
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.errorMessage = page.locator('[data-test="error"]');
    this.errorCloseButton = page.locator('[data-test="error-button"]');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
    return (await this.errorMessage.textContent()) ?? '';
  }

  async dismissError(): Promise<void> {
    const isVisible = await this.errorCloseButton.isVisible().catch(() => false);
    if (isVisible) {
      await this.errorCloseButton.click();
    }
  }

  async isErrorVisible(): Promise<boolean> {
    return this.errorMessage.isVisible().catch(() => false);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/');
  }
}
