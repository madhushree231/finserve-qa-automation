const { test, expect } = require('@playwright/test');
const { FundDetailsPage } = require('../pages/FundDetailsPage');
const { InvestPage } = require('../pages/InvestPage');
const { MutualFundsPage } = require('../pages/MutualFundsPage');

test("fund detail shows the fund's own minimums", async ({ page }) => {
  const fund = new FundDetailsPage(page);
  await fund.goto(7);

  await expect(fund.fundName).toHaveText('FinServe Balanced Allocation Fund');
  await expect(fund.investButton).toBeVisible();

  expect(await fund.minimumLumpsumValue()).toBe(5000);
  expect(await fund.minimumSipValue()).toBe(500);
});

test('FS-08 amount below the fund minimum is refused', async ({ page }) => {
  const invest = new InvestPage(page);
  await invest.goto(3);

  // Read the minimum from the page, so this works on any fund.
  const minimum = await invest.minimumLumpsumValue();
  await invest.invest({ amount: minimum - 1, payment: 'UPI' });

  expect(
    await invest.wasRejected(),
    `An order of ${minimum - 1} was accepted against a minimum of ${minimum}`,
  ).toBe(true);
  expect(await invest.fieldErrorText()).toContain('minimum lumpsum');
});

test('FS-10 lumpsum investment completes', async ({ page }) => {
  const invest = new InvestPage(page);
  await invest.goto(3);

  const minimum = await invest.minimumLumpsumValue();
  await invest.invest({ amount: minimum, payment: 'UPI' });

  expect(await invest.wasRejected(), 'A valid order was rejected').toBe(false);
});

test('category filter returns only matching funds', async ({ page }) => {
  const funds = new MutualFundsPage(page);
  await funds.goto();

  await funds.applyFilters({ category: 'Debt Fund' });
  const categories = await funds.listedCategories();

  expect(categories.length, 'Filter returned no funds').toBeGreaterThan(0);

  const wrong = categories.filter((c) => c.trim() !== 'Debt Fund');
  expect(
    wrong,
    `Category filter returned ${wrong.length} non-Debt funds: ${wrong.join(', ')}`,
  ).toHaveLength(0);
});

