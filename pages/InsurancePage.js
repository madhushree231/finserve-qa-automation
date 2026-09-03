const { parseCurrency } = require('../utils/currency');

class InsurancePage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('insurance-page');
    this.filterForm = page.getByTestId('insurance-filter-form');

    this.searchInput = page.getByTestId('insurance-search-input');
    this.typeFilter = page.getByTestId('insurance-type-filter');
    this.premiumRangeFilter = page.getByTestId('premium-range-filter');
    this.applyButton = page.getByTestId('insurance-filter-submit');
    this.resetLink = page.getByTestId('insurance-filter-reset');

    this.productCards = page.locator('article.product-card');
    this.productNames = this.productCards.locator('h2');
    this.typeBadges = this.productCards.locator('.badge');
    this.productCodes = this.productCards.locator('.product-card-header .muted');
  }

  /** The premium bands offered by the filter, as numeric bounds. */
  static PREMIUM_RANGES = {
    under_5000: { min: 0, max: 4999.99 },
    '5000_15000': { min: 5000, max: 15000 },
    above_15000: { min: 15000.01, max: Infinity },
  };

  async goto() {
    await this.page.goto('/insurance');
  }

  card(code) {
    return this.page.getByTestId(`insurance-card-${code}`);
  }

  detailsLink(code) {
    return this.page.getByTestId(`insurance-details-link-${code}`);
  }

  buyLink(code) {
    return this.page.getByTestId(`buy-insurance-link-${code}`);
  }

  async premiumFor(code) {
    const text = await this.page.getByTestId(`insurance-premium-${code}`).innerText();
    return parseCurrency(text);
  }

  async coverageFor(code) {
    const text = await this.page.getByTestId(`insurance-coverage-${code}`).innerText();
    return parseCurrency(text);
  }

  /** All three controls submit together, so set what is needed and apply once. */
  async applyFilters(opts = {}) {
    if (opts.search !== undefined) await this.searchInput.fill(opts.search);
    if (opts.type) await this.typeFilter.selectOption(opts.type);
    if (opts.premiumRange) await this.premiumRangeFilter.selectOption(opts.premiumRange);
    await this.applyButton.click();
  }

  async cardCount() { return this.productCards.count(); }
  async listedNames() { return this.productNames.allInnerTexts(); }
  async listedTypes() { return this.typeBadges.allInnerTexts(); }
  async listedCodes() {
    return (await this.productCodes.allInnerTexts()).map((t) => t.trim());
  }

  /** Every listed premium as a number, read via each card's code. */
  async listedPremiums() {
    const codes = await this.listedCodes();
    const premiums = [];
    for (const code of codes) {
      premiums.push(await this.premiumFor(code));
    }
    return premiums;
  }
}

module.exports = { InsurancePage };