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
