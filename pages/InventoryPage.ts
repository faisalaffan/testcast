import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base/BasePage';
import { HeaderComponent } from './components/HeaderComponent';
import { ProductCardComponent } from './components/ProductCardComponent';

export type SortOption = 'az' | 'za' | 'lohi' | 'hilo';

export class InventoryPage extends BasePage {
  readonly sortDropdown: Locator;
  readonly inventoryItems: Locator;
  readonly cartLink: Locator;
  readonly header: HeaderComponent;
  readonly productCard: ProductCardComponent;

  constructor(page: Page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.productCard = new ProductCardComponent(page);
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.inventoryItems = page.locator('[data-test="inventory-item"]');
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');
  }

  async selectSortOption(option: SortOption): Promise<void> {
    await this.sortDropdown.selectOption(option);
  }

  async addItemToCart(itemName: string): Promise<void> {
    await this.productCard.addItemToCart(itemName);
  }

  async addItemToCartByIndex(index: number): Promise<void> {
    await this.productCard.addItemToCartByIndex(index);
  }

  async removeItemFromCart(itemName: string): Promise<void> {
    await this.productCard.removeItemFromCart(itemName);
  }

  async getAllProductNames(): Promise<string[]> {
    return this.productCard.getAllProductNames();
  }

  async getAllProductPrices(): Promise<number[]> {
    return this.productCard.getAllProductPrices();
  }

  async getCartBadgeCount(): Promise<number> {
    return this.header.getCartBadgeCount();
  }

  async clickCart(): Promise<void> {
    await this.header.clickCart();
  }

  async logout(): Promise<void> {
    await this.header.logout();
  }

  async isOnInventoryPage(): Promise<boolean> {
    return this.page.url().includes('/inventory.html');
  }
}
