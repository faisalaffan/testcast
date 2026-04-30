import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base/BasePage';

export class CartPage extends BasePage {
  readonly cartItems: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    super(page);
    this.cartItems = page.locator('.cart_item');
    this.checkoutButton = page.locator('[data-test="checkout"]');
    this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');
  }

  async getCartItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  async getCartItemNames(): Promise<string[]> {
    const nameLocators = this.page.locator('.cart_item .inventory_item_name');
    const count = await nameLocators.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await nameLocators.nth(i).textContent();
      names.push(text ?? '');
    }
    return names;
  }

  async removeItem(itemName: string): Promise<void> {
    const item = this.cartItems.filter({ hasText: itemName });
    const removeButton = item.locator('button', { hasText: 'Remove' });
    await removeButton.click();
  }

  async clickCheckout(): Promise<void> {
    await this.checkoutButton.click();
  }

  async clickContinueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
  }

  async isCartEmpty(): Promise<boolean> {
    return (await this.cartItems.count()) === 0;
  }

  /**
   * Get all cart item prices as an array of numbers.
   */
  async getCartItemPrices(): Promise<number[]> {
    const priceLocators = this.page.locator('.cart_item .inventory_item_price');
    const count = await priceLocators.count();
    const prices: number[] = [];
    for (let i = 0; i < count; i++) {
      const text = await priceLocators.nth(i).textContent();
      prices.push(Number.parseFloat((text ?? '').replace('$', '')));
    }
    return prices;
  }
}
