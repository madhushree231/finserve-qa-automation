const { test, expect } = require('@playwright/test');
const { DashboardPage } = require('../pages/DashboardPage');
const { PortfolioPage } = require('../pages/PortfolioPage');
const { InvestPage } = require('../pages/InvestPage');
const { TransactionsPage } = require('../pages/TransactionsPage');
const { ApiClient } = require('../utils/apiClient');

test('FS-12 dashboard value updates after an investment @smoke', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  const before = await dashboard.portfolioTotal();

  const invest = new InvestPage(page);
  await invest.goto(3);
  const minimum = await invest.minimumLumpsumValue();
  await invest.invest({ amount: minimum, payment: 'UPI' });

  await dashboard.goto();
  const after = await dashboard.portfolioTotal();

  expect(
    after,
    `Dashboard showed ${before} before investing ${minimum} and ${after} after. ` +
    `Expected an increase of about ${minimum}.`,
  ).toBeGreaterThan(before);
});

test('dashboard recent transactions match the API', async ({ page }) => {
  const api = await ApiClient.create();
  const { body } = await api.get('/transactions');
  await api.dispose();

  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  for (const txn of body.data.slice(0, 5)) {
    await expect(
      dashboard.transactionRow(txn.transaction_reference),
      `${txn.transaction_reference} is in the API's five most recent ` +
      `but is missing from the dashboard`,
    ).toBeVisible();
  }
});
