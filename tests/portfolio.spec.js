const { test, expect } = require('@playwright/test');
const { PortfolioPage } = require('../pages/PortfolioPage');
const { TransactionsPage } = require('../pages/TransactionsPage');
const { ApiClient } = require('../utils/apiClient');

test('portfolio total equals the sum of its holdings', async ({ page }) => {
  const portfolio = new PortfolioPage(page);
  await portfolio.goto();

  const total = await portfolio.totalValue();
  const values = await portfolio.holdingValues();
  const sum = Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;

  expect(
    total,
    `Displayed total ${total} does not match the sum of ${values.length} holdings (${sum})`,
  ).toBeCloseTo(sum, 2);
});

test('gain equals current value minus invested', async ({ page }) => {
  const portfolio = new PortfolioPage(page);
  await portfolio.goto();

  const total = await portfolio.totalValue();
  const invested = await portfolio.investedValue();
  const gain = await portfolio.gainLossValue();

  expect(gain).toBeCloseTo(Math.round((total - invested) * 100) / 100, 2);
});

test('FS-18 transaction status on screen matches the API', async ({ page }) => {
  const api = await ApiClient.create();
  const { body } = await api.get('/transactions');
  await api.dispose();

  const transactions = new TransactionsPage(page);
  await transactions.goto();

  const mismatches = [];

  for (const txn of body.data) {
    const cell = transactions.statusFor(txn.transaction_reference);
    if (await cell.count() === 0) continue; // on a later page

    const shown = (await cell.innerText()).trim();
    if (shown !== txn.status) {
      mismatches.push(
        `${txn.transaction_reference} (${txn.transaction_type}): ` +
        `screen shows ${shown}, API reports ${txn.status}`,
      );
    }
  }

  expect(
    mismatches,
    `Status disagrees between the screen and the API:\n${mismatches.join('\n')}`,
  ).toHaveLength(0);
});

test('transaction filters return only matching rows', async ({ page }) => {
  const transactions = new TransactionsPage(page);
  await transactions.goto();

  await transactions.applyFilters({ status: 'SUCCESS' });
  const statuses = await transactions.listedStatuses();

  expect(statuses.length, 'Filter returned no rows to check').toBeGreaterThan(0);

  const wrong = statuses.filter((s) => s !== 'SUCCESS');
  expect(
    wrong,
    `Status filter returned ${wrong.length} rows that are not SUCCESS: ${wrong.join(', ')}`,
  ).toHaveLength(0);
});

test('type filter returns only the selected type', async ({ page }) => {
  const transactions = new TransactionsPage(page);
  await transactions.goto();

  await transactions.applyFilters({ type: 'Investment' });
  const types = await transactions.listedTypes();

  expect(types.length).toBeGreaterThan(0);

  const wrong = types.filter((t) => t !== 'Investment');
  expect(
    wrong,
    `Type filter returned ${wrong.length} non-Investment rows: ${wrong.join(', ')}`,
  ).toHaveLength(0);
});
