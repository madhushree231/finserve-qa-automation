class OeDocumentsPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('documents-page');
    this.form = page.getByTestId('document-upload-form');

    this.documentType = page.getByTestId('document-type-select');
    this.fileInput = page.getByTestId('document-upload-kyc');
    this.simulatedFileName = page.getByTestId('document-file-name-input');
    this.uploadButton = page.getByTestId('document-upload-button');

    this.table = page.getByTestId('documents-table');
    this.rows = this.table.locator('tbody tr');
    this.emptyState = page.getByTestId('documents-empty-state');

    this.continueToReview = page.getByTestId('documents-continue-review-button');
    this.errorAlert = page.getByTestId('validation-error-alert');
  }

  static TYPES = ['KYC_ID', 'ADDRESS_PROOF', 'INCOME_PROOF', 'OTHER'];

  async goto(applicationId) {
    await this.page.goto(
      `${process.env.ORDERENTRY_URL}/applications/${applicationId}/documents`,
    );
  }

  /**
   * The form offers a simulated file name alongside the real file input,
   * so a document can be recorded without an actual upload.
   * @param {{type?:string, fileName?:string}} doc
   */
  async uploadSimulated(doc = {}) {
    if (doc.type) await this.documentType.selectOption(doc.type);
    if (doc.fileName !== undefined) await this.simulatedFileName.fill(doc.fileName);
    await this.uploadButton.click();
  }

  async documentCount() {
    if (await this.emptyState.isVisible()) return 0;
    return this.rows.count();
  }

  async listedDocuments() {
    if (await this.emptyState.isVisible()) return [];
    const rows = await this.rows.all();
    const docs = [];
    for (const row of rows) {
      const cells = await row.locator('td').allInnerTexts();
      docs.push({
        type: (cells[0] || '').trim(),
        file: (cells[1] || '').trim(),
        sizeKb: (cells[2] || '').trim(),
        status: (cells[3] || '').trim(),
      });
    }
    return docs;
  }

  async clickContinueToReview() {
    await this.continueToReview.click();
  }

  async wasRejected() {
    return this.errorAlert.isVisible();
  }
}

module.exports = { OeDocumentsPage };