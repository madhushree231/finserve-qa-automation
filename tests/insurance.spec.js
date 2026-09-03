const { test, expect } = require('@playwright/test');
const { BuyInsurancePage } = require('../pages/BuyInsurancePage');
const { InsurancePage } = require('../pages/InsurancePage');
const { InsuranceDetailsPage } = require('../pages/InsuranceDetailsPage');
const { TransactionsPage } = require('../pages/TransactionsPage');
const { PoliciesPage } = require('../pages/PoliciesPage');

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

const TYPES = ['Term Insurance', 'Health Insurance', 'Motor Insurance', 'Travel Insurance'];

test('insurance listing shows products with coverage and premium', async ({ page }) => {
  const insurance = new InsurancePage(page);
  await insurance.goto();

  expect(await insurance.cardCount(), 'No products listed').toBeGreaterThan(0);

  const types = await insurance.listedTypes();
  const unexpected = types.filter((t) => !TYPES.includes(t.trim()));
  expect(
    unexpected,
    `Products listed with undocumented types: ${unexpected.join(', ')}`,
  ).toHaveLength(0);
});

test('insurance type filter returns only that type', async ({ page }) => {
  const insurance = new InsurancePage(page);
  await insurance.goto();

  await insurance.applyFilters({ type: 'Motor Insurance' });
  const types = await insurance.listedTypes();

  expect(types.length, 'Filter returned no products').toBeGreaterThan(0);

  const wrong = types.filter((t) => t.trim() !== 'Motor Insurance');
  expect(
    wrong,
    `Type filter returned ${wrong.length} non-Motor products: ${wrong.join(', ')}`,
  ).toHaveLength(0);
});

test('premium range filter returns only premiums inside the band', async ({ page }) => {
  const insurance = new InsurancePage(page);
  await insurance.goto();

  const band = '5000_15000';
  const { min, max } = InsurancePage.PREMIUM_RANGES[band];

  await insurance.applyFilters({ premiumRange: band });
  const premiums = await insurance.listedPremiums();

  expect(premiums.length, 'Filter returned no products').toBeGreaterThan(0);

  const outside = premiums.filter((p) => p < min || p > max);
  expect(
    outside,
    `Premium band ${min} to ${max} returned ${outside.length} products outside it: ` +
    `${outside.join(', ')}`,
  ).toHaveLength(0);
});


test('FS-25 applicant outside the eligible age range is refused', async ({ page }) => {
  const details = new InsuranceDetailsPage(page);
  await details.goto(2);

  const range = await details.eligibleAgeRange();
  test.skip(!range, 'No age range published for this product');

  await details.clickBuy();

  const buy = new BuyInsurancePage(page);

  // A date of birth making the applicant one year too old.
  const tooOld = new Date();
  tooOld.setFullYear(tooOld.getFullYear() - (range.max + 1));
  const dob = tooOld.toISOString().slice(0, 10);

  const unique = Date.now().toString().slice(-6);
  await buy.fillApplication({
    dob,
    nomineeName: `QA Nominee ${unique}`,
    relationship: 'Spouse',
    accept: true,
  });
  await buy.submit();

  expect(
    await buy.wasRejected(),
    `An applicant aged ${range.max + 1} was accepted against a stated ` +
    `eligible range of ${range.min} to ${range.max}`,
  ).toBe(true);
});

test('FS-26 applicant below the minimum eligible age is refused', async ({ page }) => {
  const details = new InsuranceDetailsPage(page);
  await details.goto(2);

  const range = await details.eligibleAgeRange();
  await details.clickBuy();

  const buy = new BuyInsurancePage(page);

  const tooYoung = new Date();
  tooYoung.setFullYear(tooYoung.getFullYear() - (range.min - 1));
  const dob = tooYoung.toISOString().slice(0, 10);

  const unique = Date.now().toString().slice(-6);
  await buy.fillApplication({
    dob,
    nomineeName: `QA Nominee ${unique}`,
    relationship: 'Spouse',
    accept: true,
  });
  await buy.submit();

  expect(
    await buy.wasRejected(),
    `An applicant aged ${range.min - 1} was accepted against a stated ` +
    `eligible range of ${range.min} to ${range.max}`,
  ).toBe(true);
});

test('FS-15 purchase creates a policy for the right product and premium @smoke', async ({ page }) => {
  const insurance = new InsurancePage(page);
  await insurance.goto();

  const code = 'FSTRVL007';
  const advertised = await insurance.premiumFor(code);

  await insurance.buyLink(code).click();

  const buy = new BuyInsurancePage(page);
  const unique = Date.now().toString().slice(-6);
  await buy.fillApplication({
    dob: '1990-01-01',
    nomineeName: `QA Nominee ${unique}`,
    relationship: 'Spouse',
    accept: true,
  });
  await buy.submit();

  expect(await buy.wasRejected(), 'A valid purchase was rejected').toBe(false);

  const policies = new PoliciesPage(page);
  await policies.goto();
  const newest = await policies.newestPolicy();

  expect(newest, 'No policies listed after purchase').not.toBeNull();
  expect(
    newest.product,
    `Newest policy is for ${newest.product}, expected Travel Guard`,
  ).toContain('Travel Guard');
  expect(
    newest.premium,
    `Policy premium is ${newest.premium}, advertised was ${advertised}`,
  ).toBeCloseTo(advertised, 2);
  expect(newest.number).toMatch(/^POL-/);
  expect(newest.status).toBe('Active');
});