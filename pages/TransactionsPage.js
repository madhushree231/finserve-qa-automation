class TransactionsPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('transactions-page');
    this.filtersCard = page.getByTestId('transaction-filters-card');
    this.table = page.getByTestId('transactions-table');
    this.rows = this.table.locator('tbody tr');

    // Filters
    this.searchInput = page.getByTestId('transaction-search-input');
    this.typeFilter = page.getByTestId('transaction-type-filter');
    this.statusFilter = page.getByTestId('transaction-status-filter');
    this.dateFrom = page.getByTestId('transaction-date-from');
    this.dateTo = page.getByTestId('transaction-date-to');
    this.applyButton = page.getByTestId('transaction-filter-submit');
    this.resetLink = page.getByTestId('transaction-filter-reset');

    // Pagination
    this.pagination = page.getByTestId('transactions-pagination');
    this.nextPageLink = this.pagination.getByRole('link', { name: /next/i }).first();
  }

  async goto() {
    await this.page.goto('/transactions');
  }

  // --- targeting one record by its reference ---

  row(reference) {
    return this.page.getByTestId(`transaction-row-${reference}`);
  }

  typeFor(reference) {
    return this.page.getByTestId(`transaction-type-${reference}`);
  }

  statusFor(reference) {
    return this.page.getByTestId(`transaction-status-${reference}`);
  }

  detailsLink(reference) {
    return this.page.getByTestId(`transaction-details-link-${reference}`);
  }

  // --- filtering ---

  /**
   * All five controls are one GET form with a single Apply button,
   * so set what is needed and submit once.
   * @param {{search?:string, type?:string, status?:string,
   *          from?:string, to?:string}} opts
   */
  async applyFilters(opts = {}) {
    if (opts.search !== undefined) await this.searchInput.fill(opts.search);
    if (opts.type) await this.typeFilter.selectOption(opts.type);
    if (opts.status) await this.statusFilter.selectOption(opts.status);
    if (opts.from) await this.dateFrom.fill(opts.from);
    if (opts.to) await this.dateTo.fill(opts.to);
    await this.applyButton.click();
  }

  async reset() {
    await this.resetLink.click();
  }

  // --- reading the table ---

  async rowCount() {
    return this.rows.count();
  }

  async listedReferences() {
    const cells = this.table.locator('[data-testid^="transaction-reference-"]');
    return (await cells.allInnerTexts()).map((t) => t.trim());
  }

  async listedStatuses() {
    const cells = this.table.locator('[data-testid^="transaction-status-"]');
    return (await cells.allInnerTexts()).map((t) => t.trim());
  }

  async listedTypes() {
    const cells = this.table.locator('[data-testid^="transaction-type-"]');
    return (await cells.allInnerTexts()).map((t) => t.trim());
  }

  /** Product name is the fourth column and has no test id of its own. */
  async listedProducts() {
    const rows = await this.rows.all();
    const products = [];
    for (const row of rows) {
      const cells = await row.locator('td').allInnerTexts();
      products.push((cells[3] || '').trim());
    }
    return products;
  }

  /** Dates as displayed, e.g. '03 Sep 2026'. */
  async listedDates() {
    const rows = await this.rows.all();
    const dates = [];
    for (const row of rows) {
      const cells = await row.locator('td').allInnerTexts();
      dates.push((cells[1] || '').trim());
    }
    return dates;
  }

  // --- pagination ---

  /** e.g. { from: 1, to: 12, total: 29 } — null when there is no pagination. */
  async paginationCounts() {
    if (!(await this.pagination.isVisible())) return null;
    const text = await this.pagination.innerText();
    const numbers = text.match(/(\d+)\s*to\s*(\d+)\s*of\s*(\d+)/);
    if (!numbers) return null;
    return {
      from: Number(numbers[1]),
      to: Number(numbers[2]),
      total: Number(numbers[3]),
    };
  }

  async goToNextPage() {
    await this.nextPageLink.click();
  }
}

module.exports = { TransactionsPage };