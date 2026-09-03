const { parseCurrency } = require('../utils/currency');

class PortfolioPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('portfolio-page');
    this.total = page.getByTestId('portfolio-total');
    this.investedTotal = page.getByTestId('portfolio-invested-total');
    this.gainLoss = page.getByTestId('portfolio-gain-loss');
    this.returnPercent = page.getByTestId('portfolio-return-percent');
    this.holdingsTable = page.getByTestId('portfolio-holdings-table');
    this.holdingRows = this.holdingsTable.locator('tbody tr');
  }

  async goto() {
    await this.page.goto('/portfolio');
  }

  async totalValue() { return parseCurrency(await this.total.innerText()); }
  async investedValue() { return parseCurrency(await this.investedTotal.innerText()); }
  async gainLossValue() { return parseCurrency(await this.gainLoss.innerText()); }

  /** Every holding's current value, as numbers. */
  async holdingValues() {
    const cells = this.holdingsTable.locator('[data-testid^="holding-current-value-"]');
    const texts = await cells.allInnerTexts();
    return texts.map(parseCurrency);
  }

  async holdingCount() { return this.holdingRows.count(); }

  holdingRow(holdingId) {
    return this.page.getByTestId(`holding-row-${holdingId}`);
  }

  redeemButton(holdingId) {
    return this.page.getByTestId(`redeem-button-${holdingId}`);
  }

  /** The id of the first holding, for tests that need any holding. */
  async firstHoldingId() {
    const testId = await this.holdingRows.first().getAttribute('data-testid');
    return testId.replace('holding-row-', '');
  }
}

module.exports = { PortfolioPage };
