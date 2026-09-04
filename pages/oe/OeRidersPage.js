class OeRidersPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('riders-page');
    this.form = page.getByTestId('riders-form');
    this.table = page.getByTestId('riders-table');
    this.rows = this.table.locator('tbody tr');
    this.summary = page.getByTestId('riders-total-premium-summary');
    this.saveAndContinue = page.getByTestId('rider-save-continue-button');
    this.errorAlert = page.getByTestId('validation-error-alert');
  }

  /** Rider codes as used in the checkbox test ids. */
  static CODES = ['ADB001', 'WOP002', 'CIR003', 'TRM004', 'ACC005', 'GIO006'];

  async goto(applicationId) {
    await this.page.goto(
      `${process.env.ORDERENTRY_URL}/applications/${applicationId}/riders`,
    );
  }

  checkbox(code) {
    return this.page.getByTestId(`rider-checkbox-${code}`);
  }

  /** Selects the given riders and clears any others. */
  async select(codes = []) {
    for (const code of OeRidersPage.CODES) {
      const box = this.checkbox(code);
      if (await box.count() === 0) continue;
      if (codes.includes(code)) await box.check();
      else await box.uncheck();
    }
  }

  async save() {
    await this.saveAndContinue.click();
  }

  async riderCount() {
    return this.rows.count();
  }

  /** Every rider on the page with its code and premium. */
  async listedRiders() {
    const rows = await this.rows.all();
    const riders = [];
    for (const row of rows) {
      const cells = await row.locator('td').allInnerTexts();
      const label = (cells[1] || '').trim();
      const code = (label.match(/\(([^)]+)\)/) || [])[1] || '';
      riders.push({
        name: label.split('(')[0].trim(),
        code,
        premium: Number.parseFloat((cells[3] || '0').replace(/[$,]/g, '')),
      });
    }
    return riders;
  }

  /** The rider premium total shown in the summary line. */
  async totalPremium() {
    const text = await this.summary.innerText();
    const match = text.match(/\$([\d,]+\.?\d*)/);
    return match ? Number.parseFloat(match[1].replace(/,/g, '')) : 0;
  }

  /** Sum of the premiums for the riders currently ticked. */
  async selectedPremiumSum() {
    const all = await this.listedRiders();
    let sum = 0;
    for (const rider of all) {
      if (await this.checkbox(rider.code).isChecked()) sum += rider.premium;
    }
    return Math.round(sum * 100) / 100;
  }
}

module.exports = { OeRidersPage };
