import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base/BasePage';

export interface CheckoutData {
  firstName: string;
  lastName: string;
  postalCode: string;
}

export interface CheckoutPriceSummary {
  /** Subtotal label text, e.g. "Item total: $29.99" */
  subtotalText: string;
  /** Tax label text, e.g. "Tax: $2.40" */
  taxText: string;
  /** Total label text, e.g. "Total: $32.39" */
  totalText: string;
  /** Subtotal value as number (extracted from label) */
  subtotalValue: number;
  /** Tax value as number */
  taxValue: number;
  /** Total value as number */
  totalValue: number;
}

export class CheckoutPage extends BasePage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly finishButton: Locator;
  readonly backHomeButton: Locator;
  readonly successMessage: Locator;
  readonly orderCompleteContainer: Locator;
  readonly summarySubtotal: Locator;
  readonly summaryTax: Locator;
  readonly summaryTotal: Locator;
  /** Individual cart item price elements on checkout-step-two.html */
  readonly cartItemPrices: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.locator('[data-test="firstName"]');
    this.lastNameInput = page.locator('[data-test="lastName"]');
    this.postalCodeInput = page.locator('[data-test="postalCode"]');
    this.continueButton = page.locator('[data-test="continue"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
    this.finishButton = page.locator('[data-test="finish"]');
    this.backHomeButton = page.locator('[data-test="back-to-products"]');
    this.successMessage = page.locator('[data-test="complete-header"]');
    this.orderCompleteContainer = page.locator('[data-test="checkout-complete-container"]');
    this.summarySubtotal = page.locator('[data-test="subtotal-label"]');
    this.summaryTax = page.locator('[data-test="tax-label"]');
    this.summaryTotal = page.locator('[data-test="total-label"]');
    /**
     * Item price divs inside the checkout summary. These are the _actual_ prices
     * of each cart item shown on the overview page. For problem_user these
     * correct prices are displayed — the BUG is in the subtotal calculation.
     * Selector: .cart_item .inventory_item_price
     */
    this.cartItemPrices = page.locator('.cart_item .inventory_item_price');
  }

  async fillCheckoutForm(data: CheckoutData): Promise<void> {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.postalCodeInput.fill(data.postalCode);
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.click();
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async clickFinish(): Promise<void> {
    await this.finishButton.click();
  }

  async clickBackHome(): Promise<void> {
    await this.backHomeButton.click();
  }

  async getSuccessMessage(): Promise<string> {
    await this.successMessage.waitFor({ state: 'visible', timeout: 5000 });
    return (await this.successMessage.textContent()) ?? '';
  }

  async getSummaryInfo(): Promise<CheckoutPriceSummary> {
    const subtotalText = (await this.summarySubtotal.textContent()) ?? '';
    const taxText = (await this.summaryTax.textContent()) ?? '';
    const totalText = (await this.summaryTotal.textContent()) ?? '';

    const parsePrice = (text: string): number => {
      const match = text.match(/[\d,]+\.\d{2}/);
      return match ? Number.parseFloat(match[0].replace(',', '')) : 0;
    };

    return {
      subtotalText,
      taxText,
      totalText,
      subtotalValue: parsePrice(subtotalText),
      taxValue: parsePrice(taxText),
      totalValue: parsePrice(totalText),
    };
  }

  /**
   * Get all individual cart item prices shown on the checkout overview page.
   * These represent the actual item prices before the buggy subtotal calculation.
   * Returns an array of price values, e.g. [29.99, 9.99]
   */
  async getCartItemPrices(): Promise<number[]> {
    const count = await this.cartItemPrices.count();
    const prices: number[] = [];
    for (let i = 0; i < count; i++) {
      const text = await this.cartItemPrices.nth(i).textContent();
      prices.push(Number.parseFloat((text ?? '').replace('$', '')));
    }
    return prices;
  }

  async isOnCheckoutStepOne(): Promise<boolean> {
    return this.page.url().includes('/checkout-step-one.html');
  }

  async isOnCheckoutStepTwo(): Promise<boolean> {
    return this.page.url().includes('/checkout-step-two.html');
  }
}
