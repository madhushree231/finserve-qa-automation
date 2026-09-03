const { test, expect } = require('@playwright/test');
const { OeLoginPage } = require('../../pages/oe/OeLoginPage');
const { OeProductPage } = require('../../pages/oe/OeProductPage');

test.use({ storageState: { cookies: [], origins: [] } });

// Update to an application id that exists in your environment.
const APPLICATION_ID = 49;
const ELITE = '3';

test.beforeEach(async ({ page }) => {
  const login = new OeLoginPage(page);
  await login.goto();
  await login.login('agent.valid@insurance.test', process.env.TEST_PASSWORD);
});

test('premium matches the published rate', async ({ page }) => {
  const product = new OeProductPage(page);
  await product.goto(APPLICATION_ID);

  await product.configure({
    productId: ELITE,
    sumAssured: 1000000,
    frequency: 'MONTHLY',
  });

  const shown = await product.premiumValue();
  const expected = OeProductPage.expectedPremium(ELITE, 1000000, 'MONTHLY');

  expect(
    shown,
    `Premium shown ${shown} does not match ${expected.toFixed(2)} ` +
    `(1,000,000 at 6.10 per 1,000, monthly)`,
  ).toBeCloseTo(expected, 2);
});

test('OE-03 sum assured below the allowed minimum is refused', async ({ page }) => {
  const product = new OeProductPage(page);
  await product.goto(APPLICATION_ID);

  const { min } = OeProductPage.PRODUCTS[ELITE];

  await product.configure({
    productId: ELITE,
    sumAssured: 10000,
    frequency: 'MONTHLY',
  });

  await expect(product.rangeHelp).toContainText('Allowed Sum Assured');

  const premium = await product.premiumValue();
  await product.save();

  const stillOnProductStep = page.url().includes('/product');

  expect(
    stillOnProductStep,
    `A sum assured of 10,000 was accepted against a stated minimum of ${min}, ` +
    `and priced at ${premium}.`,
  ).toBe(true);
});
