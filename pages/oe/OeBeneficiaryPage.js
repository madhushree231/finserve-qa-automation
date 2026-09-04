/**
 * Page object for the Beneficiaries step of the Insurance Order Entry
 * application wizard.
 *
 * Note on select values: most selects on this page use the domain code as the
 * option value (PRIMARY, INDIVIDUAL, SPOUSE). The designation select does not
 * — it is backed by is_irrevocable and uses 0/1 with the labels Revocable and
 * Irrevocable. DESIGNATIONS below maps the domain term the tests use onto the
 * value the application expects.
 */

// Per-action ceiling. The test-level timeout is a budget for the whole
// journey; a single field interaction should fail fast rather than consume it.
const ACTION_TIMEOUT = 5000;

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
    this.country = page.getByTestId('beneficiary-country-input');

    // Individual
    this.firstName = page.getByTestId('beneficiary-first-name-input');
    this.middleName = page.getByTestId('beneficiary-middle-name-input');
    this.lastName = page.getByTestId('beneficiary-last-name-input');
    this.dateOfBirth = page.getByTestId('beneficiary-dob-input');
    this.gender = page.getByTestId('beneficiary-gender-select');

    // Trust
    this.trustName = page.getByTestId('beneficiary-trust-name-input');
    this.trusteeName = page.getByTestId('beneficiary-trustee-name-input');
    this.trustDate = page.getByTestId('beneficiary-trust-date-input');
    this.trusteeContact = page.getByTestId('beneficiary-trustee-contact-input');

    // Organization
    this.organizationName = page.getByTestId('beneficiary-organization-name-input');
    this.organizationRegistration = page.getByTestId('beneficiary-organization-registration-input');
    this.organizationContact = page.getByTestId('beneficiary-organization-contact-input');

    // Conditional panels
    this.individualSection = page.locator('[data-beneficiary-section="INDIVIDUAL"]');
    this.trustSection = page.locator('[data-beneficiary-section="TRUST"]');
    this.organizationSection = page.locator('[data-beneficiary-section="ORGANIZATION"]');

    // Address
    this.addressLine1 = page.getByTestId('beneficiary-address-line-1-input');
    this.city = page.getByTestId('beneficiary-city-input');
    this.state = page.getByTestId('beneficiary-state-input');
    this.postalCode = page.getByTestId('beneficiary-postal-code-input');

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

  // Option values as the application renders them.
  static LEVELS = ['PRIMARY', 'SECONDARY'];
  static TYPES = ['INDIVIDUAL', 'TRUST', 'ORGANIZATION'];
  static RELATIONSHIPS = [
    'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'TRUST', 'ORGANIZATION', 'OTHER',
  ];
  static GENDERS = ['MALE', 'FEMALE', 'NON_BINARY'];

  // The designation select is backed by is_irrevocable, so its option values
  // are 0 and 1 rather than the domain terms used elsewhere on the page.
  static DESIGNATIONS = { REVOCABLE: '0', IRREVOCABLE: '1' };

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
   *
   * Beneficiary type is set before any type-specific field is filled, because
   * the Trust and Organization panels ship disabled and hidden and are only
   * enabled once their type is chosen.
   *
   * @param {{level?:string, type?:string, relationship?:string,
   *          allocation?:number, designation?:string,
   *          phone?:string, email?:string, country?:string,
   *          firstName?:string, middleName?:string, lastName?:string,
   *          dob?:string, gender?:string,
   *          trustName?:string, trusteeName?:string, trustDate?:string,
   *          trusteeContact?:string,
   *          organizationName?:string, organizationRegistration?:string,
   *          organizationContact?:string,
   *          addressLine1?:string, city?:string, state?:string,
   *          postalCode?:string,
   *          guardianName?:string, guardianRelationship?:string,
   *          guardianContact?:string, guardianAddress?:string,
   *          acknowledge?:boolean}} b
   */
  async fillBeneficiary(b = {}) {
    const T = { timeout: ACTION_TIMEOUT };

    // Type first, so the correct detail panel is rendered and enabled.
    if (b.type !== undefined) {
      await this.type.selectOption({ value: b.type }, T);
    }

    if (b.level !== undefined) {
      await this.level.selectOption({ value: b.level }, T);
    }
    if (b.relationship !== undefined) {
      await this.relationship.selectOption({ value: b.relationship }, T);
    }
    if (b.allocation !== undefined) {
      await this.allocation.fill(String(b.allocation), T);
    }

    if (b.designation !== undefined) {
      const value = OeBeneficiaryPage.DESIGNATIONS[b.designation];
      if (value === undefined) {
        throw new Error(
          `Unknown beneficiary designation "${b.designation}". `
          + `Expected one of: ${Object.keys(OeBeneficiaryPage.DESIGNATIONS).join(', ')}.`,
        );
      }
      await this.designation.selectOption({ value }, T);
    }

    if (b.gender !== undefined) {
      await this.gender.selectOption({ value: b.gender }, T);
    }

    const text = [
      [this.phone, b.phone],
      [this.email, b.email],
      [this.country, b.country],
      [this.firstName, b.firstName],
      [this.middleName, b.middleName],
      [this.lastName, b.lastName],
      [this.dateOfBirth, b.dob],
      [this.trustName, b.trustName],
      [this.trusteeName, b.trusteeName],
      [this.trustDate, b.trustDate],
      [this.trusteeContact, b.trusteeContact],
      [this.organizationName, b.organizationName],
      [this.organizationRegistration, b.organizationRegistration],
      [this.organizationContact, b.organizationContact],
      [this.addressLine1, b.addressLine1],
      [this.city, b.city],
      [this.state, b.state],
      [this.postalCode, b.postalCode],
      [this.guardianName, b.guardianName],
      [this.guardianRelationship, b.guardianRelationship],
      [this.guardianContact, b.guardianContact],
      [this.guardianAddress, b.guardianAddress],
    ];
    for (const [field, value] of text) {
      if (value !== undefined) await field.fill(String(value), T);
    }

    if (b.acknowledge !== undefined) {
      if (b.acknowledge) {
        await this.legalAcknowledgement.check(T);
      } else {
        await this.legalAcknowledgement.uncheck(T);
      }
    }
  }

  async save() {
    await this.saveButton.click({ timeout: ACTION_TIMEOUT });
  }

  async addBeneficiary(b = {}) {
    await this.fillBeneficiary(b);
    await this.save();
  }

  /**
   * Continue is an anchor, not a submit, so it advances the wizard without
   * saving or validating anything on this step. Kept deliberately so tests
   * can exercise that behaviour.
   */
  async clickContinue() {
    await this.continueButton.click({ timeout: ACTION_TIMEOUT });
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
    const classes = (await section.getAttribute('class')) || '';
    return !classes.includes('d-none');
  }

  /** Reads the option values the application actually renders for a select. */
  async optionValues(locator) {
    return locator.evaluate((el) => [...el.options].map((o) => o.value).filter((v) => v !== ''));
  }
}

module.exports = { OeBeneficiaryPage };