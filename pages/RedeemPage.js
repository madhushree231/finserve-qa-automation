const { parseCurrency } = require('../utils/currency');

class RedeemPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('redemption-page');
    this.form = page.getByTestId('redemption-form');

    // Holding summary
    this.fundName = page.getByTestId('redemption-fund-name');
    this.availableUnits = page.getByTestId('available-units');
    this.availableValue = page.getByTestId('available-value');

    // Request form
    this.byUnits = page.getByTestId('redeem-mode-units');
    this.byAmount = page.getByTestId('redeem-mode-amount');
    this.unitsInput = page.getByTestId('redeem-units-input');
    this.amountInput = page.getByTestId('redeem-amount-input');
    this.declaration = page.getByTestId('redemption-declaration-checkbox');
    this.confirmButton = page.getByTestId('confirm-redemption-button');

    // Errors
    this.errorSummary = page.getByTestId('form-error-summary');
    this.errorSummaryItems = this.errorSummary.locator('li');
    this.fieldErrors = page.getByTestId('redemption-error');

    // Confirmation
    this.confirmationPage = page.getByTestId('redemption-confirmation-page');
    this.confirmationMessage = page.getByTestId('redemption-confirmation-message');
    this.redemptionReference = page.getByTestId('redemption-reference');
    this.transactionReference = page.getByTestId('redemption-transaction-reference');
    this.redeemedUnits = page.getByTestId('redeemed-units');
    this.redeemedAmount = page.getByTestId('redeemed-amount');
    this.viewPortfolioLink = page.getByTestId('view-portfolio-after-redemption');
    this.viewTransactionsLink = page.getByTestId('view-transactions-after-redemption');
  }

  /** Confirmation lands on a fixed URL, not one keyed to the reference. */
  static CONFIRMATION_PATH = '/redemptions/confirmation';

  async goto(holdingId) {
    await this.page.goto(`/redeem/${holdingId}`);
  }

  /** The holding's current value, as a number. */
  async availableValueAmount() {
    return parseCurrency(await this.availableValue.innerText());
  }

  /** The units held, as a number. */
  async availableUnitCount() {
    return parseCurrency(await this.availableUnits.innerText());
  }

  /**
   * Submits a redemption. Pass either amount or units, not both.
   * @param {{amount?:number, units?:number, accept?:boolean}} opts
   */
  async redeem(opts = {}) {
    const { amount, units, accept = true } = opts;

    if (amount !== undefined) {
      await this.byAmount.check();
      await this.amountInput.fill(String(amount));
    } else if (units !== undefined) {
      await this.byUnits.check();
      await this.unitsInput.fill(String(units));
    }

    if (accept) await this.declaration.check();
    await this.confirmButton.click();
  }

  // --- rejection ---

  async summaryErrors() {
    return this.errorSummaryItems.allInnerTexts();
  }

  async wasRejected() {
    return this.errorSummary.isVisible();
  }

  // --- confirmation ---

  async wasConfirmed() {
    return this.confirmationPage.isVisible();
  }

  /** Amount actually redeemed, as a number. */
  async confirmedAmount() {
    return parseCurrency(await this.redeemedAmount.innerText());
  }

  /** Units actually redeemed, as a number. */
  async confirmedUnits() {
    return Number.parseFloat(await this.redeemedUnits.innerText());
  }

  /** e.g. TXN-20260903095211-ZFOV5 */
  async transactionRef() {
    return (await this.transactionReference.innerText()).trim();
  }

  /** e.g. RDM-20260903095211-TZXU3 */
  async redemptionRef() {
    return (await this.redemptionReference.innerText()).trim();
  }
}

module.exports = { RedeemPage };