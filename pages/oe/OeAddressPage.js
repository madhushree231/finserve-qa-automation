class OeAddressPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('address-contact-page');
    this.form = page.getByTestId('address-contact-form');

    this.residentialStreet = page.getByTestId('residential-address-line-1-input');
    this.residentialApt = page.getByTestId('residential-address-line-2-input');
    this.residentialCity = page.getByTestId('residential-city-input');
    this.residentialState = page.getByTestId('residential-state-province-select');
    this.residentialZip = page.getByTestId('residential-postal-code-input');

    this.sameAsResidential = page.getByTestId('address-same-as-residential-checkbox');
    this.mailingStreet = page.getByTestId('mailing-address-line-1-input');
    this.mailingApt = page.getByTestId('mailing-address-line-2-input');
    this.mailingCity = page.getByTestId('mailing-city-input');
    this.mailingState = page.getByTestId('mailing-state-province-select');
    this.mailingZip = page.getByTestId('mailing-postal-code-input');
    this.sameAddressNote = page.locator('#same-address-note');

    this.primaryEmail = page.getByTestId('contact-primary-email-input');
    this.mobileNumber = page.getByTestId('contact-mobile-number-input');
    this.alternatePhone = page.getByTestId('contact-alternate-phone-input');
    this.preferredMode = page.getByTestId('contact-preferred-mode-select');

    this.saveAndContinue = page.getByTestId('address-contact-save-continue-button');
    this.errorAlert = page.getByTestId('validation-error-alert');
    this.errorAlertItems = this.errorAlert.locator('li');
    this.fieldErrors = this.form.locator('.invalid-feedback');
  }

  async goto(applicationId) {
    await this.page.goto(
      `${process.env.ORDERENTRY_URL}/applications/${applicationId}/address-contact`,
    );
  }

  async fillResidential(address = {}) {
    const map = [
      [this.residentialStreet, address.street],
      [this.residentialApt, address.apt],
      [this.residentialCity, address.city],
      [this.residentialZip, address.zip],
    ];
    for (const [field, value] of map) {
      if (value !== undefined) await field.fill(value);
    }
    if (address.state) await this.residentialState.selectOption(address.state);
  }

  async fillMailing(address = {}) {
    const map = [
      [this.mailingStreet, address.street],
      [this.mailingCity, address.city],
      [this.mailingZip, address.zip],
    ];
    for (const [field, value] of map) {
      if (value !== undefined) await field.fill(value);
    }
    if (address.state) await this.mailingState.selectOption(address.state);
  }

  async copyResidentialToMailing() {
    await this.sameAsResidential.check();
  }

  async fillContact(contact = {}) {
    const map = [
      [this.primaryEmail, contact.email],
      [this.mobileNumber, contact.mobile],
      [this.alternatePhone, contact.alternate],
    ];
    for (const [field, value] of map) {
      if (value !== undefined) await field.fill(value);
    }
    if (contact.mode) await this.preferredMode.selectOption(contact.mode);
  }

  async save() {
    await this.saveAndContinue.click();
  }

  async alertErrors() { return this.errorAlertItems.allInnerTexts(); }

  async visibleFieldErrors() {
    const texts = await this.fieldErrors.allInnerTexts();
    return texts.map((t) => t.trim()).filter(Boolean);
  }

  async wasRejected() { return this.errorAlert.isVisible(); }

  async mailingValues() {
    return {
      street: await this.mailingStreet.inputValue(),
      city: await this.mailingCity.inputValue(),
      state: await this.mailingState.inputValue(),
      zip: await this.mailingZip.inputValue(),
    };
  }
}

module.exports = { OeAddressPage };
