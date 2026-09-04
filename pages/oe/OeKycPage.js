/**
 * Page object for the "KYC, Financial, and Compliance" step of the
 * Insurance Order Entry application wizard.
 *
 * Note on test IDs: this page namespaces its test IDs by SECTION, not by page.
 *   kyc-*         identity fields
 *   financial-*   income, net worth, source of funds, risk profile
 *   compliance-*  PEP and declaration
 * The save button belongs to the form as a whole and carries the compound
 * name kyc-financial-save-continue-button.
 */

// Per-action ceiling. The test-level timeout is a budget for the whole
// journey; a single field interaction should fail fast and legibly rather
// than silently consuming it.
const ACTION_TIMEOUT = 5000;

class OeKycPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('kyc-financial-page');
    this.form = page.getByTestId('kyc-financial-form');

    // KYC details
    this.idType = page.getByTestId('kyc-id-type-select');
    this.idNumber = page.getByTestId('kyc-id-number-input');
    this.issueDate = page.getByTestId('kyc-issue-date-input');
    this.expiryDate = page.getByTestId('kyc-expiry-date-input');

    // Financial profile
    this.annualIncome = page.getByTestId('financial-annual-income-input');
    this.netWorth = page.getByTestId('financial-net-worth-input');
    this.sourceOfFunds = page.getByTestId('financial-source-of-funds-select');
    this.riskProfile = page.getByTestId('financial-risk-profile-select');

    // Compliance
    this.pep = page.getByTestId('compliance-pep-select');
    this.pepDetails = page.getByTestId('compliance-pep-details-input');
    this.declaration = page.getByTestId('compliance-declaration-checkbox');

    this.saveAndContinue = page.getByTestId('kyc-financial-save-continue-button');

    this.errorAlert = page.getByTestId('validation-error-alert');
    this.errorAlertItems = this.errorAlert.locator('li');
  }

  // These mirror the option LABELS rendered by the application. Verified
  // against the live DOM. Keep them in sync via assertOptionsMatchApplication().
  static ID_TYPES = ['SSN', 'STATE_ID', 'PASSPORT', 'DRIVERS_LICENSE'];
  static SOURCES = ['SALARY', 'BUSINESS', 'INVESTMENTS', 'INHERITANCE'];
  static RISK_PROFILES = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'];
  // is_pep is the one select where value and label differ: value 0/1, label No/Yes.
  static PEP_VALUES = ['No', 'Yes'];

  async goto(applicationId) {
    await this.page.goto(
      `${process.env.ORDERENTRY_URL}/applications/${applicationId}/kyc-financial`,
    );
  }

  /** Fills only what is passed, so negative tests can leave fields out. */
  async fill(details = {}) {
    const text = [
      [this.idNumber, details.idNumber],
      [this.issueDate, details.issueDate],
      [this.expiryDate, details.expiryDate],
      [this.annualIncome, details.annualIncome],
      [this.netWorth, details.netWorth],
      [this.pepDetails, details.pepDetails],
    ];
    for (const [field, value] of text) {
      if (value !== undefined) {
        await field.fill(String(value), { timeout: ACTION_TIMEOUT });
      }
    }

    // Selecting by label throughout. Bare-string selectOption() matches on
    // value OR label, which hides mismatches until they time out; being
    // explicit makes a wrong fixture value fail for an obvious reason.
    const selects = [
      [this.idType, details.idType],
      [this.sourceOfFunds, details.sourceOfFunds],
      [this.riskProfile, details.riskProfile],
      [this.pep, details.pep],
    ];
    for (const [field, value] of selects) {
      if (value !== undefined) {
        await field.selectOption({ label: String(value) }, { timeout: ACTION_TIMEOUT });
      }
    }

    if (details.declare !== undefined) {
      // The checkbox has a hidden sibling input of the same name that posts 0
      // when unchecked. Always target it by test ID, never by name.
      if (details.declare) {
        await this.declaration.check({ timeout: ACTION_TIMEOUT });
      } else {
        await this.declaration.uncheck({ timeout: ACTION_TIMEOUT });
      }
    }
  }

  async save() {
    await this.saveAndContinue.click({ timeout: ACTION_TIMEOUT });
  }

  async errors() {
    if (!(await this.errorAlert.isVisible())) return [];
    return this.errorAlertItems.allInnerTexts();
  }

  async wasRejected() {
    return this.errorAlert.isVisible();
  }

  /** Reads the option labels the application actually renders for a select. */
  async optionLabels(locator) {
    return locator.evaluate((el) => [...el.options].map((o) => o.text.trim()));
  }

  /**
   * Guards against the failure mode that broke this page: hand-copied option
   * constants drifting from the application. Returns a plain object so a test
   * can assert on it, rather than asserting internally.
   */
  async readAllOptionLabels() {
    return {
      idType: await this.optionLabels(this.idType),
      sourceOfFunds: await this.optionLabels(this.sourceOfFunds),
      riskProfile: await this.optionLabels(this.riskProfile),
      pep: await this.optionLabels(this.pep),
    };
  }
}

module.exports = { OeKycPage };