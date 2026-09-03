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

test('dashboard and portfolio pages agree on total value', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  const onDashboard = await dashboard.portfolioTotal();

  const portfolio = new PortfolioPage(page);
  await portfolio.goto();
  const onPortfolio = await portfolio.totalValue();

  expect(
    onDashboard,
    `Dashboard shows ${onDashboard}, portfolio page shows ${onPortfolio}`,
  ).toBeCloseTo(onPortfolio, 2);
});

test('latest investment appears in transaction history', async ({ page }) => {
  const invest = new InvestPage(page);
  await invest.goto(3);
  const minimum = await invest.minimumLumpsumValue();
  await invest.invest({ amount: minimum, payment: 'UPI' });

  const api = await ApiClient.create();
  const { body } = await api.get('/transactions');
  await api.dispose();

  const newest = body.data[0];

  const transactions = new TransactionsPage(page);
  await transactions.goto();

  await expect(
    transactions.row(newest.transaction_reference),
    `Transaction ${newest.transaction_reference} is the newest in the API ` +
    `but does not appear on the transactions page`,
  ).toBeVisible();
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
