class MutualFundsPage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('mutual-funds-page');

    this.searchInput = page.getByTestId('fund-search-input');
    this.categoryFilter = page.getByTestId('fund-category-filter');
    this.riskFilter = page.getByTestId('fund-risk-filter');
    this.sortSelect = page.getByTestId('fund-sort-select');
    this.applyButton = page.getByTestId('fund-filter-submit');
    this.resetLink = page.getByTestId('fund-filter-reset');

    this.fundCards = page.locator('article.product-card');
    this.fundNames = this.fundCards.locator('h2');
    this.fundCodes = this.fundCards.locator('p.muted');
    this.categoryBadges = this.fundCards.locator('.badge');
    this.riskLabels = this.fundCards.locator('.risk');
  }

  async goto() {
    await this.page.goto('/mutual-funds');
  }

  fundCard(code) {
    return this.page.getByTestId(`fund-card-${code}`);
  }

  detailsLink(code) {
    return this.page.getByTestId(`fund-details-link-${code}`);
  }

  async search(term) {
    await this.searchInput.fill(term);
    await this.applyButton.click();
  }

  /**
   * The four controls are one GET form with a single Apply button,
   * so set what is needed and submit once.
   */
  async applyFilters(opts = {}) {
    if (opts.search !== undefined) await this.searchInput.fill(opts.search);
    if (opts.category) await this.categoryFilter.selectOption(opts.category);
    if (opts.risk) await this.riskFilter.selectOption(opts.risk);
    if (opts.sort) await this.sortSelect.selectOption(opts.sort);
    await this.applyButton.click();
  }

  async cardCount() { return this.fundCards.count(); }
  async listedNames() { return this.fundNames.allInnerTexts(); }
  async listedCategories() { return this.categoryBadges.allInnerTexts(); }
  /** Returns e.g. 'High Risk' — note the appended word. */
  async listedRisks() { return this.riskLabels.allInnerTexts(); }
  async listedCodes() { return this.fundCodes.allInnerTexts(); }
  async selectedCategory() { return this.categoryFilter.inputValue(); }
  async selectedRisk() { return this.riskFilter.inputValue(); }

  async returnFor(code) {
    const text = await this.page.getByTestId(`fund-return-${code}`).innerText();
    return Number.parseFloat(text.replace('%', ''));
  }

  async listedReturns() {
    const texts = await this.fundCards
      .locator('[data-testid^="fund-return-"]')
      .allInnerTexts();
    return texts.map((t) => Number.parseFloat(t.replace('%', '')));
  }
}

module.exports = { MutualFundsPage };
