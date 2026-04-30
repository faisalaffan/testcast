import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base/BasePage';

export class ProductDetailPage extends BasePage {
  readonly backToProductsButton: Locator;
  readonly productName: Locator;
  readonly productDescription: Locator;
  readonly productPrice: Locator;
  readonly productImage: Locator;
  readonly addToCartButton: Locator;
  readonly removeButton: Locator;
  /** Banner/alert shown when description fails to render */
  readonly renderErrorBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.backToProductsButton = page.locator('[data-test="back-to-products"]');
    this.productName = page.locator('[data-test="inventory-item-name"]');
    this.productDescription = page.locator('[data-test="inventory-item-desc"]');
    this.productPrice = page.locator('[data-test="inventory-item-price"]');
    this.productImage = page.locator('[data-test="inventory-item-image"]');
    this.addToCartButton = page.locator('[data-test*="add-to-cart"]');
    this.removeButton = page.locator('[data-test*="remove"]');
    /**
     * error_user exposes a bug where this banner appears on product detail.
     * The banner text contains "failed to render" and "Backtrace".
     * Locator matches any element containing this error text.
     */
    this.renderErrorBanner = page.locator('text=/failed to render/i, text=/Backtrace/i');
  }

  /**
   * Check if the render error banner is visible.
   * Returns true when error_user visits product detail — the description
   * fails to render and a "failed to render" error is shown instead.
   */
  async isRenderErrorVisible(): Promise<boolean> {
    // Try multiple selectors that might contain the error message
    const errorSelectors = [
      // Generic error container
      '..error-message-container',
      // Any element with the specific Backtrace error text
      '[data-test="error"]',
      // Body text search for the known error message
      ...((await this.page
        .locator('*')
        .filter({ hasText: /failed to render/i })
        .count()) > 0
        ? ['body']
        : []),
    ];

    for (const selector of errorSelectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible({ timeout: 500 }).catch(() => false)) {
        const text = await locator.textContent().catch(() => '');
        if (/failed to render/i.test(text ?? '')) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get the product description text.
   * For error_user this will return the error message instead of real description.
   */
  async getDescription(): Promise<string> {
    await this.productDescription.waitFor({ state: 'visible', timeout: 5000 });
    return (await this.productDescription.textContent()) ?? '';
  }

  /**
   * Get the product price as a number.
   */
  async getPrice(): Promise<number> {
    const text = await this.productPrice.textContent();
    return Number.parseFloat((text ?? '').replace('$', ''));
  }

  /**
   * Get the product name.
   */
  async getProductName(): Promise<string> {
    return (await this.productName.textContent()) ?? '';
  }

  /**
   * Check if the product image has failed to load (broken image).
   * A broken image has naturalWidth === 0 after load completes.
   */
  async isImageBroken(): Promise<boolean> {
    return this.page.evaluate(() => {
      const images = document.querySelectorAll('[data-test="inventory-item-image"]');
      for (const img of Array.from(images)) {
        if (img instanceof HTMLImageElement) {
          // Image is broken if it failed to load OR has 0 natural dimensions
          if (!img.complete || img.naturalWidth === 0) {
            return true;
          }
        }
      }
      return false;
    });
  }

  /**
   * Click "Add to cart" button for the current product.
   */
  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }

  /**
   * Click "Remove" button to remove product from cart.
   */
  async removeFromCart(): Promise<void> {
    await this.removeButton.click();
  }

  /**
   * Navigate back to inventory page.
   */
  async backToProducts(): Promise<void> {
    await this.backToProductsButton.click();
  }

  /**
   * Check if we are on a product detail page (URL contains 'inventory-item')
   */
  async isOnProductDetailPage(): Promise<boolean> {
    return this.page.url().includes('inventory-item');
  }
}
