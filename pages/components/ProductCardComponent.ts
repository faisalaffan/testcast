import type { Page } from '@playwright/test';

export class ProductCardComponent {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async addItemToCart(itemName: string): Promise<void> {
    const item = this.page.locator('[data-test="inventory-item"]').filter({ hasText: itemName });
    const addButton = item.locator('button', { hasText: 'Add to cart' });
    await addButton.click();
  }

  async addItemToCartByIndex(index: number): Promise<void> {
    const items = this.page.locator('[data-test="inventory-item"]');
    const addButton = items.nth(index).locator('button', { hasText: 'Add to cart' });
    await addButton.click();
  }

  async removeItemFromCart(itemName: string): Promise<void> {
    const item = this.page.locator('[data-test="inventory-item"]').filter({ hasText: itemName });
    const removeButton = item.locator('button', { hasText: 'Remove' });
    await removeButton.click();
  }

  async getAllProductNames(): Promise<string[]> {
    const nameLocators = this.page.locator('[data-test="inventory-item-name"]');
    const count = await nameLocators.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await nameLocators.nth(i).textContent();
      names.push(text ?? '');
    }
    return names;
  }

  async getAllProductPrices(): Promise<number[]> {
    const priceLocators = this.page.locator('[data-test="inventory-item-price"]');
    const count = await priceLocators.count();
    const prices: number[] = [];
    for (let i = 0; i < count; i++) {
      const text = await priceLocators.nth(i).textContent();
      const price = Number.parseFloat((text ?? '').replace('$', ''));
      prices.push(price);
    }
    return prices;
  }
}
