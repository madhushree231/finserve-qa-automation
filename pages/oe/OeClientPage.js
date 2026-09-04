/**
 * Page object for the Client / Insured Information step of the Insurance
 * Order Entry application wizard.
 *
 * Every mandatory field on this step carries a required attribute, so the
 * browser blocks submission when one is empty. Note that the Beneficiaries
 * step does not do this for its own starred fields.
 *
 * Save and Continue is a real POST submit. The three Back and Summary
 * controls are plain anchors and do not save or validate anything.
 */

const ACTION_TIMEOUT = 5000;

class OeClientPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('client-information-page');
    this.form = page.getByTestId('client-information-form');
    this.statusAlert = page.getByTestId('status-alert');

    // Workflow navigation. All anchors, all unvalidated.
    this.backButton = page.getByTestId('workflow-back-button');
    this.summaryButton = page.getByTestId('workflow-summary-button');
    this.backToOverviewLink = page.getByTestId('client-back-overview-link');

    // Fields
    this.firstName = page.getByTestId('client-first-name-input');
    this.middleName = page.getByTestId('client-middle-name-input');
    this.lastName = page.getByTestId('client-last-name-input');
    this.dateOfBirth = page.getByTestId('client-dob-input');
    this.gender = page.getByTestId('client-gender-select');
    this.maritalStatus = page.getByTestId('client-marital-status-select');
    this.nationality = page.getByTestId('client-nationality-input');
    this.occupation = page.getByTestId('client-occupation-input');
    this.employerName = page.getByTestId('client-employer-name-input');
    this.employerAddress = page.getByTestId('client-employer-address-input');

    this.saveAndContinue = page.getByTestId('client-save-continue-button');
    this.validationAlert = page.getByTestId('validation-error-alert');
    this.validationAlertItems = this.validationAlert.locator('li');
  }

  // Option values as the application renders them. Value and label are
  // identical on both selects here.
  static GENDERS = ['MALE', 'FEMALE', 'NON_BINARY'];
  static MARITAL_STATUSES = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];

  async goto(applicationId) {
    await this.page.goto(
      `${process.env.ORDERENTRY_URL}/applications/${applicationId}/client`,
    );
  }

  /** Fills only what is passed, so negative tests can leave fields out. */
  async fill(details = {}) {
    const T = { timeout: ACTION_TIMEOUT };

    const map = [
      [this.firstName, details.firstName],
      [this.middleName, details.middleName],
      [this.lastName, details.lastName],
      [this.dateOfBirth, details.dob],
      [this.nationality, details.nationality],
      [this.occupation, details.occupation],
      [this.employerName, details.employerName],
      [this.employerAddress, details.employerAddress],
    ];
    for (const [field, value] of map) {
      if (value !== undefined) await field.fill(String(value), T);
    }

    // Explicit match mode. Bare-string selectOption matches on value OR
    // label, which hides a mismatch until it times out.
    if (details.gender !== undefined) {
      await this.gender.selectOption({ value: details.gender }, T);
    }
    if (details.maritalStatus !== undefined) {
      await this.maritalStatus.selectOption({ value: details.maritalStatus }, T);
    }
  }

  async save() {
    await this.saveAndContinue.click({ timeout: ACTION_TIMEOUT });
  }

  /** What the form holds, for checking a draft was persisted. */
  async currentValues() {
    return {
      firstName: await this.firstName.inputValue(),
      middleName: await this.middleName.inputValue(),
      lastName: await this.lastName.inputValue(),
      dob: await this.dateOfBirth.inputValue(),
      gender: await this.gender.inputValue(),
      maritalStatus: await this.maritalStatus.inputValue(),
      nationality: await this.nationality.inputValue(),
      occupation: await this.occupation.inputValue(),
      employerName: await this.employerName.inputValue(),
      employerAddress: await this.employerAddress.inputValue(),
    };
  }

  /** The banner shown after a draft is created or a step is saved. */
  async statusMessage() {
    if (!(await this.statusAlert.isVisible())) return null;
    return (await this.statusAlert.innerText()).trim();
  }

  async errors() {
    if (!(await this.validationAlert.isVisible())) return [];
    return this.validationAlertItems.allInnerTexts();
  }

  async wasRejected() {
    return this.validationAlert.isVisible();
  }

  /**
   * Whether the browser will block submission on a field left empty. Used to
   * distinguish client-side enforcement from server-side, and to compare
   * enforcement across wizard steps.
   */
  async isFieldRequired(field) {
    return field.evaluate((el) => el.hasAttribute('required'));
  }

  /** Reads the option values the application actually renders for a select. */
  async optionValues(locator) {
    return locator.evaluate((el) => [...el.options].map((o) => o.value).filter((v) => v !== ''));
  }
}

module.exports = { OeClientPage };