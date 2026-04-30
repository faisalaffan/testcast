import type { Locator, Page } from '@playwright/test';

export class HeaderComponent {
  readonly page: Page;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;
  readonly burgerMenuButton: Locator;
  readonly logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
    this.burgerMenuButton = page.locator('button', { hasText: 'Open Menu' });
    this.logoutLink = page.locator('[data-test="logout-sidebar-link"]');
  }

  async clickCart(): Promise<void> {
    await this.cartLink.click();
  }

  async getCartBadgeCount(): Promise<number> {
    const isVisible = await this.cartBadge.isVisible().catch(() => false);
    if (!isVisible) return 0;
    const text = await this.cartBadge.textContent();
    return Number.parseInt(text ?? '0', 10);
  }

  async logout(): Promise<void> {
    await this.burgerMenuButton.click();
    await this.page.waitForSelector('[data-test="logout-sidebar-link"]', { state: 'visible' });
    await this.logoutLink.click();
  }
}
