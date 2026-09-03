class OeDashboardPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('dashboard-page');
    this.newApplicationButton = page.getByTestId('dashboard-new-application-button');
    this.viewAllLink = page.getByTestId('dashboard-view-all-applications-link');

    this.draftTile = page.getByTestId('dashboard-summary-draft');
    this.submittedTile = page.getByTestId('dashboard-summary-submitted');
    this.underReviewTile = page.getByTestId('dashboard-summary-under-review');
    this.approvedTile = page.getByTestId('dashboard-summary-approved');
    this.requiresInfoTile = page.getByTestId('dashboard-summary-requires-info');

    this.table = page.getByTestId('dashboard-applications-table');
    this.rows = this.table.locator('tbody tr');
  }

  /** The five states an application can be in. */
  static STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER REVIEW', 'APPROVED', 'REQUIRES INFO', 'REJECTED'];

  async goto() {
    await this.page.goto(`${process.env.ORDERENTRY_URL}/dashboard`);
  }

  async gotoApplicationsList() {
    await this.page.goto(`${process.env.ORDERENTRY_URL}/applications`);
  }

  /** Reads the number from a summary tile. */
  async tileCount(tile) {
    const text = await tile.locator('.display-6').innerText();
    return Number.parseInt(text.trim(), 10);
  }

  async counts() {
    return {
      draft: await this.tileCount(this.draftTile),
      submitted: await this.tileCount(this.submittedTile),
      underReview: await this.tileCount(this.underReviewTile),
      approved: await this.tileCount(this.approvedTile),
      requiresInfo: await this.tileCount(this.requiresInfoTile),
    };
  }

  /** Target one application by its id. */
  openLink(applicationId) {
    return this.page.getByTestId(`application-open-${applicationId}`);
  }

  statusFor(applicationId) {
    return this.page.getByTestId(`application-status-${applicationId}`);
  }

  async rowCount() { return this.rows.count(); }

  /** Every row as an object, since most columns have no test id. */
  async listedApplications() {
    const rows = await this.rows.all();
    const applications = [];
    for (const row of rows) {
      const cells = await row.locator('td').allInnerTexts();
      applications.push({
        reference: (cells[0] || '').trim(),
        client: (cells[1] || '').trim(),
        product: (cells[2] || '').trim(),
        status: (cells[3] || '').trim(),
        updated: (cells[4] || '').trim(),
      });
    }
    return applications;
  }

  async listedStatuses() {
    const all = await this.listedApplications();
    return all.map((a) => a.status);
  }

  async startNewApplication() {
    await this.newApplicationButton.click();
  }
}

module.exports = { OeDashboardPage };