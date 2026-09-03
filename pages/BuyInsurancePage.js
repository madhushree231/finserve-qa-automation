const { parseCurrency } = require('../utils/currency');

class BuyInsurancePage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('insurance-purchase-page');
    this.form = page.getByTestId('insurance-purchase-form');

    this.productPremium = page.getByTestId('insurance-product-premium-value');
    this.reviewPremium = page.getByTestId('review-premium-value');

    this.insuredName = page.getByTestId('insured-name-input');
    this.insuredDob = page.getByTestId('insured-dob-input');
    this.insuredMobile = page.getByTestId('insured-mobile-input');
    this.insuredEmail = page.getByTestId('insured-email-input');
    this.nomineeName = page.getByTestId('nominee-name-input');
    this.nomineeRelationship = page.getByTestId('nominee-relationship-select');
    this.declaration = page.getByTestId('insurance-declaration-checkbox');
    this.confirmButton = page.getByTestId('confirm-policy-button');

    this.errorSummary = page.getByTestId('form-error-summary');
    this.errorSummaryItems = this.errorSummary.locator('li');
  }

  async goto(productId) {
    await this.page.goto(`/buy-insurance/${productId}`);
  }

  async productPremiumValue() {
    return parseCurrency(await this.productPremium.innerText());
  }

  async reviewPremiumValue() {
    return parseCurrency(await this.reviewPremium.innerText());
  }

  /** Fills only what is passed, so negative tests can omit fields. */
  async fillApplication(details = {}) {
    const map = [
      [this.insuredName, details.name],
      [this.insuredDob, details.dob],
      [this.insuredMobile, details.mobile],
      [this.insuredEmail, details.email],
      [this.nomineeName, details.nomineeName],
    ];
    for (const [field, value] of map) {
      if (value !== undefined) await field.fill(value);
    }
    if (details.relationship) {
      await this.nomineeRelationship.selectOption(details.relationship);
    }
    if (details.accept) await this.declaration.check();
  }

  async submit() {
    await this.confirmButton.click();
  }

  async summaryErrors() { return this.errorSummaryItems.allInnerTexts(); }
  async wasRejected() { return this.errorSummary.isVisible(); }
}

module.exports = { BuyInsurancePage };
