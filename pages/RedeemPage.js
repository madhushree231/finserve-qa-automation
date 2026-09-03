const { parseCurrency } = require('../utils/currency');

class RedeemPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('redemption-page');
    this.form = page.getByTestId('redemption-form');

    this.fundName = page.getByTestId('redemption-fund-name');
    this.availableUnits = page.getByTestId('available-units');
    this.availableValue = page.getByTestId('available-value');

    this.byUnits = page.getByTestId('redeem-mode-units');
    this.byAmount = page.getByTestId('redeem-mode-amount');
    this.unitsInput = page.getByTestId('redeem-units-input');
    this.amountInput = page.getByTestId('redeem-amount-input');
    this.declaration = page.getByTestId('redemption-declaration-checkbox');
    this.confirmButton = page.getByTestId('confirm-redemption-button');

    this.errorSummary = page.getByTestId('form-error-summary');
    this.errorSummaryItems = this.errorSummary.locator('li');
    this.fieldErrors = page.getByTestId('redemption-error');
  }

  async goto(holdingId) {
    await this.page.goto(`/redeem/${holdingId}`);
  }

  async availableValueAmount() {
    return parseCurrency(await this.availableValue.innerText());
  }

  async availableUnitCount() {
    return parseCurrency(await this.availableUnits.innerText());
  }

  /** @param {{amount?:number, units?:number, accept?:boolean}} opts */
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

  async summaryErrors() { return this.errorSummaryItems.allInnerTexts(); }
  async wasRejected() { return this.errorSummary.isVisible(); }
}

module.exports = { RedeemPage };
