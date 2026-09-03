class TransactionsPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('transactions-page');
    this.table = page.getByTestId('transactions-table');
    this.rows = this.table.locator('tbody tr');

    this.searchInput = page.getByTestId('transaction-search-input');
    this.typeFilter = page.getByTestId('transaction-type-filter');
    this.statusFilter = page.getByTestId('transaction-status-filter');
    this.applyButton = page.getByTestId('transaction-filter-submit');
    this.resetLink = page.getByTestId('transaction-filter-reset');
  }

  async goto() {
    await this.page.goto('/transactions');
  }

  row(reference) {
    return this.page.getByTestId(`transaction-row-${reference}`);
  }

  typeFor(reference) {
    return this.page.getByTestId(`transaction-type-${reference}`);
  }

  statusFor(reference) {
    return this.page.getByTestId(`transaction-status-${reference}`);
  }

  async applyFilters(opts = {}) {
    if (opts.search !== undefined) await this.searchInput.fill(opts.search);
    if (opts.type) await this.typeFilter.selectOption(opts.type);
    if (opts.status) await this.statusFilter.selectOption(opts.status);
    await this.applyButton.click();
  }

  async listedStatuses() {
    const cells = this.table.locator('[data-testid^="transaction-status-"]');
    return (await cells.allInnerTexts()).map((t) => t.trim());
  }

  async listedTypes() {
    const cells = this.table.locator('[data-testid^="transaction-type-"]');
    return (await cells.allInnerTexts()).map((t) => t.trim());
  }

  async rowCount() { return this.rows.count(); }
}

module.exports = { TransactionsPage };
