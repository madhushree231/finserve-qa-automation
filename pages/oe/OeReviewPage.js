class OeReviewPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('review-page');

    this.validationErrors = page.getByTestId('review-validation-errors');
    this.validationErrorItems = this.validationErrors.locator('li');
    this.validationSuccess = page.getByTestId('review-validation-success');
    this.validateButton = page.getByTestId('review-validate-button');
    this.submitButton = page.getByTestId('review-submit-application-button');
    this.backButton = page.getByTestId('review-back-button');

    this.snapshot = page.getByTestId('review-application-snapshot');
    this.calculatedAge = page.getByTestId('review-client-calculated-age');
    this.totalPremium = page.getByTestId('review-total-premium');

    // Confirmation, reached after submitting.
    this.confirmationPage = page.getByTestId('submission-confirmation-page');
    this.confirmationReference = page.getByTestId('confirmation-reference-number');
    this.viewStatusLink = page.getByTestId('confirmation-view-status-link');
    this.dashboardLink = page.getByTestId('confirmation-dashboard-link');
  }

  async goto(applicationId) {
    await this.page.goto(
      `${process.env.ORDERENTRY_URL}/applications/${applicationId}/review`,
    );
  }

  async runValidation() {
    await this.validateButton.click();
  }

  async blockingErrors() {
    if (!(await this.validationErrors.isVisible())) return [];
    return (await this.validationErrorItems.allInnerTexts()).map((t) => t.trim());
  }

  async hasBlockingErrors() {
    return this.validationErrors.isVisible();
  }

  /** True when validation reported no blocking errors. */
  async validationPassed() {
    return this.validationSuccess.isVisible();
  }

  /** Submit is disabled while blocking errors remain. */
  async canSubmit() {
    return this.submitButton.isEnabled();
  }

  async submit() {
    await this.submitButton.click();
  }

  /** Reads a snapshot value by its label, e.g. 'Sum Assured'. */
  snapshotValue(label) {
    return this.snapshot
      .locator('dt')
      .filter({ hasText: label })
      .locator('+ dd');
  }

  async ageValue() {
    return Number.parseInt((await this.calculatedAge.innerText()).trim(), 10);
  }

  async totalPremiumValue() {
    const text = (await this.totalPremium.innerText()).trim();
    return Number.parseFloat(text.replace(/[$,]/g, ''));
  }

  async status() {
    return (await this.snapshotValue('Status').innerText()).trim();
  }

  // --- confirmation ---

  async wasSubmitted() {
    return this.confirmationPage.isVisible();
  }

  /** e.g. WL2026090462898 */
  async submissionReference() {
    return (await this.confirmationReference.innerText()).trim();
  }
}

module.exports = { OeReviewPage };
