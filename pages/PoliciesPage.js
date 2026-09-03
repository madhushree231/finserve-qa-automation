const { parseCurrency } = require('../utils/currency');

class PoliciesPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('policies-page');
    this.filterForm = page.getByTestId('policy-filter-form');
    this.statusFilter = page.getByTestId('policy-status-filter');
    this.applyButton = this.filterForm.getByRole('button', { name: 'Apply' });
    this.table = page.locator('.table-card table');
    this.rows = this.table.locator('tbody tr');
  }

  /** Status values the filter offers. */
  static STATUSES = ['Active', 'Pending Issuance', 'Expired', 'Renewal Due', 'Cancelled'];

  async goto() {
    await this.page.goto('/policies');
  }

  row(policyId) {
    return this.page.getByTestId(`policy-row-${policyId}`);
  }

  numberFor(policyId) {
    return this.page.getByTestId(`policy-number-${policyId}`);
  }

  statusFor(policyId) {
    return this.page.getByTestId(`policy-status-${policyId}`);
  }

  detailsLink(policyId) {
    return this.page.getByTestId(`policy-details-link-${policyId}`);
  }

  async applyStatusFilter(status) {
    await this.statusFilter.selectOption(status);
    await this.applyButton.click();
  }

  async rowCount() { return this.rows.count(); }

  async listedNumbers() {
    const cells = this.table.locator('[data-testid^="policy-number-"]');
    return (await cells.allInnerTexts()).map((t) => t.trim());
  }

  async listedStatuses() {
    const cells = this.table.locator('[data-testid^="policy-status-"]');
    return (await cells.allInnerTexts()).map((t) => t.trim());
  }

  /** Every row as an object, since most columns have no test id. */
  async allPolicies() {
    const rows = await this.rows.all();
    const policies = [];
    for (const row of rows) {
      const cells = await row.locator('td').allInnerTexts();
      policies.push({
        number: (cells[0] || '').trim(),
        product: (cells[1] || '').trim(),
        coverage: parseCurrency(cells[2] || '0'),
        premium: parseCurrency(cells[3] || '0'),
        status: (cells[4] || '').trim(),
        endDate: (cells[5] || '').trim(),
      });
    }
    return policies;
  }

  /** The most recently issued policy, which is the first row. */
  async newestPolicy() {
    const all = await this.allPolicies();
    return all[0] ?? null;
  }
}

module.exports = { PoliciesPage };