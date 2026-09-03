const { test, expect } = require('@playwright/test');
const { PortfolioPage } = require('../pages/PortfolioPage');
const { RedeemPage } = require('../pages/RedeemPage');

test('FS-13 redemption above the available value is refused', async ({ page }) => {
  const portfolio = new PortfolioPage(page);
  await portfolio.goto();
  const holdingId = await portfolio.firstHoldingId();

  const redeem = new RedeemPage(page);
  await redeem.goto(holdingId);

  const available = await redeem.availableValueAmount();
  await redeem.redeem({ amount: available + 1, accept: true });

  expect(
    await redeem.wasRejected(),
    `A redemption of ${available + 1} was accepted against an available value of ${available}`,
  ).toBe(true);

  const errors = (await redeem.summaryErrors()).join(' ');
  expect(errors).toContain('cannot exceed available holding value');
});

test('FS-14 redemption above the available units is refused', async ({ page }) => {
  const portfolio = new PortfolioPage(page);
  await portfolio.goto();
  const holdingId = await portfolio.firstHoldingId();

  const redeem = new RedeemPage(page);
  await redeem.goto(holdingId);

  const units = await redeem.availableUnitCount();
  await redeem.redeem({ units: units + 1, accept: true });

  expect(
    await redeem.wasRejected(),
    `A redemption of ${units + 1} units was accepted against ${units} held`,
  ).toBe(true);
});

test('redemption declaration is mandatory', async ({ page }) => {
  const portfolio = new PortfolioPage(page);
  await portfolio.goto();
  const holdingId = await portfolio.firstHoldingId();

  const redeem = new RedeemPage(page);
  await redeem.goto(holdingId);

  const available = await redeem.availableValueAmount();
  await redeem.redeem({ amount: Math.floor(available * 0.1), accept: false });

  expect(await redeem.wasRejected()).toBe(true);
  const errors = (await redeem.summaryErrors()).join(' ');
  expect(errors).toContain('declaration');
});

test('FS-11 redemption completes and reduces the holding', async ({ page }) => {
  const portfolio = new PortfolioPage(page);
  await portfolio.goto();

  const holdingId = await portfolio.firstHoldingId();
  const totalBefore = await portfolio.totalValue();
  const investedBefore = await portfolio.investedValue();

  const redeem = new RedeemPage(page);
  await redeem.goto(holdingId);

  const availableBefore = await redeem.availableValueAmount();
  const unitsBefore = await redeem.availableUnitCount();

  await redeem.redeem({ amount: 1000, accept: true });

  // Confirmation
  await expect(page).toHaveURL(/redemptions\/confirmation/);
  expect(await redeem.wasConfirmed(), 'Redemption was not confirmed').toBe(true);

  const amountRedeemed = await redeem.confirmedAmount();
  const unitsRedeemed = await redeem.confirmedUnits();
  const reference = await redeem.transactionRef();

  expect(amountRedeemed).toBeCloseTo(1000, 2);
  expect(reference).toMatch(/^TXN-/);
  expect(unitsRedeemed).toBeGreaterThan(0);

  // Navigate the way a customer would, rather than by URL
  await redeem.viewPortfolioLink.click();
  await expect(page).toHaveURL(/portfolio/);
  await expect(portfolio.root).toBeVisible();

  const totalAfter = await portfolio.totalValue();

  expect(
    totalAfter,
    `Portfolio total was ${totalBefore} before redeeming ${amountRedeemed}, ` +
    `and ${totalAfter} after. Expected a drop of about ${amountRedeemed}.`,
  ).toBeCloseTo(totalBefore - amountRedeemed, 0);

  // The holding itself
  await redeem.goto(holdingId);
  const availableAfter = await redeem.availableValueAmount();
  const unitsAfter = await redeem.availableUnitCount();

  expect(
    availableAfter,
    `Holding was ${availableBefore} before and ${availableAfter} after`,
  ).toBeLessThan(availableBefore);

  expect(
    unitsAfter,
    `Units were ${unitsBefore} before and ${unitsAfter} after. ` +
    `Expected a reduction of ${unitsRedeemed}.`,
  ).toBeCloseTo(unitsBefore - unitsRedeemed, 2);
});

test('confirmation links reach portfolio and transactions', async ({ page }) => {
  const portfolio = new PortfolioPage(page);
  await portfolio.goto();
  const holdingId = await portfolio.firstHoldingId();

  const redeem = new RedeemPage(page);
  await redeem.goto(holdingId);
  await redeem.redeem({ amount: 500, accept: true });

  await expect(redeem.viewPortfolioLink).toBeVisible();
  await expect(redeem.viewTransactionsLink).toBeVisible();

  await redeem.viewTransactionsLink.click();
  await expect(page).toHaveURL(/transactions/);
});
