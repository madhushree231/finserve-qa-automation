const { parseCurrency } = require('../utils/currency');

class InsuranceDetailsPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('insurance-details-page');

    this.name = page.getByTestId('insurance-detail-name');
    this.coverage = page.getByTestId('insurance-detail-coverage');
    this.premium = page.getByTestId('insurance-detail-premium');
    this.backToList = page.getByTestId('back-to-insurance-list');
    this.buyButton = page.getByTestId('buy-insurance-button');

    // Policy term and eligible age have no test ids of their own.
    this.metrics = this.root.locator('.detail-metrics > div');
  }

  async goto(productId) {
    await this.page.goto(`/insurance/${productId}`);
  }

  async premiumValue() {
    return parseCurrency(await this.premium.innerText());
  }

  async coverageValue() {
    return parseCurrency(await this.coverage.innerText());
  }

  /** Reads a metric by its label, e.g. 'Policy Term' or 'Eligible Age'. */
  metricValue(label) {
    return this.metrics.filter({ hasText: label }).locator('dd');
  }

  /** Parses "18 - 55 years" into { min: 18, max: 55 }. */
  async eligibleAgeRange() {
    const text = await this.metricValue('Eligible Age').innerText();
    const parts = text.match(/(\d+)\s*-\s*(\d+)/);
    if (!parts) return null;
    return { min: Number(parts[1]), max: Number(parts[2]) };
  }

  async clickBuy() {
    await this.buyButton.click();
  }
}

module.exports = { InsuranceDetailsPage };