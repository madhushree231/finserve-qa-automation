class OeClientPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('client-information-page');
    this.form = page.getByTestId('client-information-form');
    this.statusAlert = page.getByTestId('status-alert');
    this.backButton = page.getByTestId('workflow-back-button');
    this.summaryButton = page.getByTestId('workflow-summary-button');

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
  }

  async goto(applicationId) {
    await this.page.goto(
      `${process.env.ORDERENTRY_URL}/applications/${applicationId}/client`,
    );
  }

  /** Fills only what is passed, so negative tests can leave fields out. */
  async fill(details = {}) {
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
      if (value !== undefined) await field.fill(value);
    }
    if (details.gender) await this.gender.selectOption(details.gender);
    if (details.maritalStatus) await this.maritalStatus.selectOption(details.maritalStatus);
  }

  async save() {
    await this.saveAndContinue.click();
  }

  /** What the form holds, for checking a draft was persisted. */
  async currentValues() {
    return {
      firstName: await this.firstName.inputValue(),
      lastName: await this.lastName.inputValue(),
      dob: await this.dateOfBirth.inputValue(),
      occupation: await this.occupation.inputValue(),
    };
  }
}

module.exports = { OeClientPage };
