/**
 * Page object for the Insurance Order Entry agent dashboard, the applications
 * list, and the start-application confirmation page.
 *
 * Starting an application is a two stage flow:
 *   /dashboard          [Start New Application]     -> /applications/new
 *   /applications/new   [Create Draft Application]  -> POST /applications
 *                                                   -> /applications/{id}/client
 *
 * The second stage is a real form submit with a CSRF token, not a link, and
 * the browser sits briefly on the POST target /applications before the
 * redirect arrives. Both stages are therefore verified individually, with a
 * navigation window wide enough to absorb a slow POST.
 */

const ACTION_TIMEOUT = 5000;
const NAVIGATION_TIMEOUT = 10000;

class OeDashboardPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('dashboard-page');

    this.newApplicationButton = page.getByTestId('dashboard-new-application-button');
    this.viewAllLink = page.getByTestId('dashboard-view-all-applications-link');

    // Summary tiles
    this.draftTile = page.getByTestId('dashboard-summary-draft');
    this.submittedTile = page.getByTestId('dashboard-summary-submitted');
    this.underReviewTile = page.getByTestId('dashboard-summary-under-review');
    this.approvedTile = page.getByTestId('dashboard-summary-approved');
    this.requiresInfoTile = page.getByTestId('dashboard-summary-requires-info');

    // Tables. The dashboard and the full list use different test ids for the
    // same kind of table.
    this.table = page.getByTestId('dashboard-applications-table');
    this.applicationsTable = page.getByTestId('applications-table');
    this.rows = this.table.locator('tbody tr');

    // Start-application confirmation page at /applications/new
    this.startPage = page.getByTestId('application-start-page');
    this.startForm = page.getByTestId('application-start-form');
    this.createDraftButton = page.getByTestId('application-create-draft-button');
    this.cancelLink = page.getByTestId('application-start-cancel-link');
  }

  static STATUSES = [
    'DRAFT', 'SUBMITTED', 'UNDER REVIEW',
    'APPROVED', 'REQUIRES INFO', 'REJECTED',
  ];

  async goto() {
    await this.page.goto(`${process.env.ORDERENTRY_URL}/dashboard`);
  }

  async gotoApplicationsList() {
    await this.page.goto(`${process.env.ORDERENTRY_URL}/applications`);
  }

  async gotoNewApplication() {
    await this.page.goto(`${process.env.ORDERENTRY_URL}/applications/new`);
  }

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

  openLink(applicationId) {
    return this.page.getByTestId(`application-open-${applicationId}`);
  }

  statusFor(applicationId) {
    return this.page.getByTestId(`application-status-${applicationId}`);
  }

  async rowCount() {
    return this.rows.count();
  }

  /**
   * Reads whichever applications table is on the current page.
   *
   * Note: the dashboard shows only the most recent applications, so this is
   * not a complete list and must not be compared against the summary tiles.
   */
  async listedApplications() {
    const table = (await this.applicationsTable.count()) > 0
      ? this.applicationsTable
      : this.table;
    const rows = await table.locator('tbody tr').all();
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

  /**
   * Two stages, each verified.
   *
   * Stage one must reach /applications/new. Stage two must reach a client
   * step. Anything else is reported with the URL actually reached and any
   * message the application displayed, so a failure names its own cause
   * instead of surfacing as a bare URL mismatch further down the test.
   *
   * @returns {Promise<string>} the id of the created draft application
   */
  async startNewApplication() {
    await this.newApplicationButton.click({ timeout: ACTION_TIMEOUT });

    try {
      await this.page.waitForURL(/\/applications\/new$/, { timeout: NAVIGATION_TIMEOUT });
    } catch {
      throw new Error(
        'Start New Application did not reach the draft confirmation page. '
        + `Landed on ${this.page.url()}.`,
      );
    }

    await this.createDraftButton.click({ timeout: ACTION_TIMEOUT });

    try {
      await this.page.waitForURL(/\/applications\/\d+\/client/, { timeout: NAVIGATION_TIMEOUT });
    } catch {
      const message = await this.pageMessage();
      throw new Error(
        'Create Draft Application did not create a draft. '
        + `Landed on ${this.page.url()}.`
        + (message ? ` Page message: "${message}".` : ' No message was displayed.'),
      );
    }

    return this.currentApplicationId();
  }

  /** Abandons the start page without creating a draft. Returns to the dashboard. */
  async cancelNewApplication() {
    await this.cancelLink.click({ timeout: ACTION_TIMEOUT });
    await this.page.waitForURL(/\/dashboard$/, { timeout: NAVIGATION_TIMEOUT });
  }

  /** The application id in the current URL, or null when there is not one. */
  currentApplicationId() {
    const match = this.page.url().match(/\/applications\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Any alert banner on the current page. Used to explain a redirect rather
   * than leaving the reason to guesswork.
   */
  async pageMessage() {
    const alert = this.page.locator('.alert').first();
    if ((await alert.count()) === 0) return null;
    return (await alert.innerText()).trim();
  }
}

module.exports = { OeDashboardPage };