const { parseCurrency } = require('../utils/currency');

class DashboardPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('dashboard-page');
    this.heading = this.root.locator('h1');
    this.portfolioValue = page.getByTestId('portfolio-total-value');
    this.recentTransactionRows = this.root.locator('table tbody tr');
    this.logoutButton = page.getByTestId('logout-button');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  /**
   * Only the portfolio tile has a test id, so the others are found
   * by their label and read from the same card.
   * @param {string} label e.g. 'Invested Amount'
   */
  statValue(label) {
    return this.page
      .locator('.stat-card')
      .filter({ hasText: label })
      .locator('.stat-value');
  }

  async portfolioTotal() {
    return parseCurrency(await this.portfolioValue.innerText());
  }

  async statAsNumber(label) {
    return parseCurrency(await this.statValue(label).innerText());
  }

  /** Target a specific transaction by reference rather than by position. */
  transactionRow(reference) {
    return this.page.getByTestId(`transaction-row-${reference}`);
  }

  fundCard(fundCode) {
    return this.page.getByTestId(`fund-card-${fundCode}`);
  }
}

module.exports = { DashboardPage };
