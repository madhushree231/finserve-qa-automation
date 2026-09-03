class OeProductPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('product-configuration-page');
    this.form = page.getByTestId('product-configuration-form');

    this.productSelect = page.getByTestId('product-select');
    this.rangeHelp = page.getByTestId('product-range-help');
    this.sumAssured = page.getByTestId('product-sum-assured-input');
    this.frequency = page.getByTestId('product-premium-frequency-select');
    this.paymentTerm = page.getByTestId('product-payment-term-select');
    this.coverageTerm = page.getByTestId('product-coverage-term-select');
    this.premium = page.getByTestId('product-current-total-premium');
    this.premiumHelp = page.getByTestId('premium-preview-help');
    this.saveAndContinue = page.getByTestId('product-save-continue-button');
  }

  async goto(applicationId) {
    await this.page.goto(
      `${process.env.ORDERENTRY_URL}/applications/${applicationId}/product`,
    );
  }

  /**
   * Rates and limits taken from the application's own pricing table,
   * so a test can compute the expected premium rather than assert a
   * hardcoded figure.
   */
  static PRODUCTS = {
    '1': { name: 'SecureLife Whole Life', rate: 4.75, min: 100000, max: 1000000 },
    '2': { name: 'WealthBuilder Whole Life', rate: 5.35, min: 150000, max: 1500000 },
    '3': { name: 'Elite Legacy Whole Life', rate: 6.10, min: 500000, max: 5000000 },
    '4': { name: 'FlexiPay Whole Life', rate: 5.15, min: 100000, max: 1200000 },
  };

  static DIVISOR = { MONTHLY: 12, QUARTERLY: 4, SEMI_ANNUAL: 2, ANNUAL: 1 };

  static expectedPremium(productId, sumAssured, frequency = 'MONTHLY') {
    const { rate } = OeProductPage.PRODUCTS[productId];
    const annual = (sumAssured / 1000) * rate;
    return annual / OeProductPage.DIVISOR[frequency];
  }

  async configure(opts = {}) {
    const { productId, sumAssured, frequency, paymentTerm = '15', coverageTerm } = opts;

    if (productId) await this.productSelect.selectOption(productId);
    if (sumAssured !== undefined) await this.sumAssured.fill(String(sumAssured));
    if (frequency) await this.frequency.selectOption(frequency);
    if (paymentTerm) await this.paymentTerm.selectOption(paymentTerm);
    if (coverageTerm) await this.coverageTerm.selectOption(coverageTerm);
  }

  async save() {
    await this.saveAndContinue.click();
  }

  /** The premium shown, as a number. "$508.33" -> 508.33 */
  async premiumValue() {
    const text = (await this.premium.innerText()).trim();
    if (text === 'Pending') return null;
    return Number.parseFloat(text.replace(/[$,]/g, ''));
  }

  async rangeText() {
    return (await this.rangeHelp.innerText()).trim();
  }
}

module.exports = { OeProductPage };
