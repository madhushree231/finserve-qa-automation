class OeBeneficiaryPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('beneficiary-page');
    this.form = page.getByTestId('beneficiary-form');

    this.allocationSummary = page.getByTestId('beneficiary-allocation-summary');
    this.estateFallbackMessage = page.getByTestId('estate-assignment-fallback-message');
    this.table = page.getByTestId('beneficiary-table');
    this.emptyState = page.getByTestId('beneficiary-empty-state');
    this.rows = this.table.locator('tbody tr');

    // Main details
    this.level = page.getByTestId('beneficiary-level-select');
    this.type = page.getByTestId('beneficiary-type-select');
    this.relationship = page.getByTestId('beneficiary-relationship-select');
    this.allocation = page.getByTestId('beneficiary-allocation-input');
    this.designation = page.getByTestId('beneficiary-designation-select');
    this.phone = page.getByTestId('beneficiary-phone-input');
    this.email = page.getByTestId('beneficiary-email-input');

    // Individual
    this.firstName = page.getByTestId('beneficiary-first-name-input');
    this.lastName = page.getByTestId('beneficiary-last-name-input');
    this.dateOfBirth = page.getByTestId('beneficiary-dob-input');
    this.gender = page.getByTestId('beneficiary-gender-select');

    // Trust
    this.trustName = page.getByTestId('beneficiary-trust-name-input');
    this.trusteeName = page.getByTestId('beneficiary-trustee-name-input');

    // Organization
    this.organizationName = page.getByTestId('beneficiary-organization-name-input');

    // Conditional panels
    this.individualSection = page.locator('[data-beneficiary-section="INDIVIDUAL"]');
    this.trustSection = page.locator('[data-beneficiary-section="TRUST"]');
    this.organizationSection = page.locator('[data-beneficiary-section="ORGANIZATION"]');

    // Guardian
    this.guardianSection = page.getByTestId('minor-guardian-section');
    this.guardianName = page.getByTestId('beneficiary-guardian-name-input');
    this.guardianRelationship = page.getByTestId('beneficiary-guardian-relationship-input');
    this.guardianContact = page.getByTestId('beneficiary-guardian-contact-input');
    this.guardianAddress = page.getByTestId('beneficiary-guardian-address-input');
    this.legalAcknowledgement = page.getByTestId('beneficiary-legal-acknowledgement-checkbox');

    this.saveButton = page.getByTestId('beneficiary-save-button');
    this.continueButton = page.getByTestId('beneficiary-continue-button');
    this.errorAlert = page.getByTestId('validation-error-alert');
    this.errorAlertItems = this.errorAlert.locator('li');
    this.beneficiaryErrorSummary = page.getByTestId('beneficiary-error-summary');
    this.beneficiaryErrorItems = this.beneficiaryErrorSummary.locator('li');
  }

  async goto(applicationId) {
    await this.page.goto(
      `${process.env.ORDERENTRY_URL}/applications/${applicationId}/beneficiaries`,
    );
  }

  /**
   * Allocation totals are exposed as data attributes, which is more
   * reliable than parsing the displayed text.
   * @returns {Promise<{primary:number, secondary:number}>}
   */
  async allocationTotals() {
    const primary = await this.allocationSummary.getAttribute('data-primary-total');
    const secondary = await this.allocationSummary.getAttribute('data-secondary-total');
    return { primary: Number(primary), secondary: Number(secondary) };
  }

  /**
   * Adds a beneficiary. Pass only what the test needs set.
   * @param {{level?:string, type?:string, relationship?:string,
   *          allocation?:number, designation?:string,
   *          firstName?:string, lastName?:string, dob?:string,
   *          guardianName?:string, guardianRelationship?:string,
   *          guardianContact?:string, guardianAddress?:string,
   *          acknowledge?:boolean, trustName?:string,
   *          trusteeName?:string, organizationName?:string}} b
   */
  async fillBeneficiary(b = {}) {
    if (b.level) await this.level.selectOption(b.level);
    if (b.type) await this.type.selectOption(b.type);
    if (b.relationship) await this.relationship.selectOption(b.relationship);
    if (b.allocation !== undefined) await this.allocation.fill(String(b.allocation));
    if (b.designation) await this.designation.selectOption(b.designation);

    const text = [
      [this.firstName, b.firstName],
      [this.lastName, b.lastName],
      [this.dateOfBirth, b.dob],
      [this.trustName, b.trustName],
      [this.trusteeName, b.trusteeName],
      [this.organizationName, b.organizationName],
      [this.guardianName, b.guardianName],
      [this.guardianRelationship, b.guardianRelationship],
      [this.guardianContact, b.guardianContact],
      [this.guardianAddress, b.guardianAddress],
    ];
    for (const [field, value] of text) {
      if (value !== undefined) await field.fill(value);
    }

    if (b.acknowledge) await this.legalAcknowledgement.check();
  }

  async save() {
    await this.saveButton.click();
  }

  async addBeneficiary(b = {}) {
    await this.fillBeneficiary(b);
    await this.save();
  }

  /** Continue is a link, not a submit, so it bypasses the form. */
  async clickContinue() {
    await this.continueButton.click();
  }

  async beneficiaryCount() {
    if (await this.emptyState.isVisible()) return 0;
    return this.rows.count();
  }

  /** Every saved beneficiary as an object. */
  async listedBeneficiaries() {
    if (await this.emptyState.isVisible()) return [];
    const rows = await this.rows.all();
    const list = [];
    for (const row of rows) {
      const cells = await row.locator('td').allInnerTexts();
      list.push({
        level: (cells[0] || '').trim(),
        type: (cells[1] || '').trim(),
        name: (cells[2] || '').trim(),
        designation: (cells[3] || '').trim(),
        relationship: (cells[4] || '').trim(),
        age: (cells[5] || '').trim(),
        allocation: (cells[6] || '').trim(),
      });
    }
    return list;
  }

    /** Both error surfaces, combined and de-duplicated. */
  async errors() {
    const all = [];
    if (await this.errorAlert.isVisible()) {
      all.push(...(await this.errorAlertItems.allInnerTexts()));
    }
    if (await this.beneficiaryErrorSummary.isVisible()) {
      all.push(...(await this.beneficiaryErrorItems.allInnerTexts()));
    }
    return [...new Set(all.map((t) => t.trim()))];
  }

  async wasRejected() {
    return (await this.errorAlert.isVisible())
        || (await this.beneficiaryErrorSummary.isVisible());
  }

  /** True when a panel is shown, false when hidden via d-none. */
  async isSectionVisible(type) {
    const section = this.page.locator(`[data-beneficiary-section="${type}"]`);
    const classes = await section.getAttribute('class');
    return !classes.includes('d-none');
  }
}

module.exports = { OeBeneficiaryPage };