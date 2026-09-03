const { test, expect } = require('@playwright/test');
const { BuyInsurancePage } = require('../pages/BuyInsurancePage');

const PRODUCT_ID = 2;

test('FS-16 review premium matches the product premium', async ({ page }) => {
  const buy = new BuyInsurancePage(page);
  await buy.goto(PRODUCT_ID);

  const product = await buy.productPremiumValue();
  const review = await buy.reviewPremiumValue();

  expect(
    review,
    `Premium at review (${review}) differs from the product premium (${product})`,
  ).toBeCloseTo(product, 2);
});

test('FS-17 missing nominee details block the purchase', async ({ page }) => {
  const buy = new BuyInsurancePage(page);
  await buy.goto(PRODUCT_ID);

  // Clear explicitly, in case the form retains prior input.
  await buy.nomineeName.fill('');
  await buy.nomineeRelationship.selectOption('');
  await buy.fillApplication({ dob: '1990-01-01', accept: true });
  await buy.submit();

  expect(
    await buy.wasRejected(),
    'A purchase without nominee details was accepted',
  ).toBe(true);
});

test('FS-15 policy purchase completes with valid details', async ({ page }) => {
  const buy = new BuyInsurancePage(page);
  await buy.goto(PRODUCT_ID);

  const unique = Date.now().toString().slice(-6);

  await buy.fillApplication({
    dob: '1990-01-01',
    nomineeName: `QA Nominee ${unique}`,
    relationship: 'Spouse',
    accept: true,
  });
  await buy.submit();

  expect(await buy.wasRejected(), 'A valid purchase was rejected').toBe(false);
});
