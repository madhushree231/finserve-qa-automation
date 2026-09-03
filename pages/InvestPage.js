const { parseCurrency } = require('../utils/currency');

class InvestPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('investment-page');
    this.form = page.getByTestId('investment-form');

    this.lumpsumOption = page.getByTestId('investment-type-lumpsum');
    this.sipOption = page.getByTestId('investment-type-sip');
    this.amountInput = page.getByTestId('investment-amount-input');
    this.paymentMethod = page.getByTestId('payment-method-select');
    this.declaration = page.getByTestId('investment-declaration-checkbox');
    this.confirmButton = page.getByTestId('confirm-investment-button');

    this.errorSummary = page.getByTestId('form-error-summary');
    this.errorSummaryItems = this.errorSummary.locator('li');
    this.fieldErrors = page.getByTestId('investment-error');

    this.summaryCard = this.root.locator('.fund-summary-card');
  }

  async goto(fundId) {
    await this.page.goto(`/invest/${fundId}`);
  }

  /** Reads a value from the fund summary panel by its row label. */
  summaryValue(label) {
    return this.summaryCard
      .locator('.details-row')
      .filter({ hasText: label })
      .locator('strong');
  }

  async minimumLumpsumValue() {
    return parseCurrency(await this.summaryValue('Minimum Lumpsum').innerText());
  }

  async minimumSipValue() {
    return parseCurrency(await this.summaryValue('Minimum SIP').innerText());
  }

  /**
   * Fills without submitting, so negative tests control what is left out.
   * @param {{amount?:number|string, type?:'Lumpsum'|'SIP',
   *          payment?:string, accept?:boolean}} opts
   */
  async fillOrder(opts = {}) {
    const { amount, type = 'Lumpsum', payment = 'UPI', accept = true } = opts;

    if (type === 'SIP') await this.sipOption.check();
    else await this.lumpsumOption.check();

    if (amount !== undefined) await this.amountInput.fill(String(amount));
    if (payment) await this.paymentMethod.selectOption(payment);
    if (accept) await this.declaration.check();
  }

  async submit() {
    await this.confirmButton.click();
  }

  async invest(opts = {}) {
    await this.fillOrder(opts);
    await this.submit();
  }

  async summaryErrors() {
    return this.errorSummaryItems.allInnerTexts();
  }

  async fieldErrorText() {
    const texts = await this.fieldErrors.allInnerTexts();
    return texts.join(' | ').trim();
  }

  async wasRejected() {
    return this.errorSummary.isVisible();
  }
}

module.exports = { InvestPage };
