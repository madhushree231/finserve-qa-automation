const { parseCurrency } = require('../utils/currency');

class FundDetailsPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('fund-details-page');
    this.fundName = page.getByTestId('fund-detail-name');
    this.nav = page.getByTestId('fund-detail-nav');
    this.oneYearReturn = page.getByTestId('fund-detail-one-year-return');
    this.minimumSip = page.getByTestId('fund-detail-minimum-sip');
    this.minimumLumpsum = page.getByTestId('fund-detail-minimum-lumpsum');
    this.investButton = page.getByTestId('invest-now-button');
    this.summaryLine = this.root.locator('p.muted');
  }

  async goto(fundId) {
    await this.page.goto(`/mutual-funds/${fundId}`);
  }

  async navValue() {
    return parseCurrency(await this.nav.innerText());
  }

  /**
   * The fund's own lumpsum minimum. Boundary tests derive their values
   * from this, because the minimum differs per fund.
   */
  async minimumLumpsumValue() {
    return parseCurrency(await this.minimumLumpsum.innerText());
  }

  async minimumSipValue() {
    return parseCurrency(await this.minimumSip.innerText());
  }

  /** Splits "FSBAL007 · Hybrid Fund · Moderate Risk" into its parts. */
  async summary() {
    const text = await this.summaryLine.innerText();
    const [code, category, risk] = text.split('·').map((s) => s.trim());
    return { code, category, risk };
  }

  async clickInvest() {
    await this.investButton.click();
  }
}

module.exports = { FundDetailsPage };
