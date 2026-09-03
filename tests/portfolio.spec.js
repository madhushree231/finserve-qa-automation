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

test('search by reference finds that exact transaction', async ({ page }) => {
  const transactions = new TransactionsPage(page);
  await transactions.goto();

  const references = await transactions.listedReferences();
  expect(references.length).toBeGreaterThan(0);
  const target = references[0];

  await transactions.applyFilters({ search: target });
  const found = await transactions.listedReferences();

  expect(found, `Searching for ${target} did not return it`).toContain(target);
  expect(found.length, `Searching a unique reference returned ${found.length} rows`).toBe(1);
});