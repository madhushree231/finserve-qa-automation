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

test('under 5000 band excludes anything at or above 5000', async ({ page }) => {
  const insurance = new InsurancePage(page);
  await insurance.goto();

  await insurance.applyFilters({ premiumRange: 'under_5000' });
  const premiums = await insurance.listedPremiums();

  expect(premiums.length).toBeGreaterThan(0);

  const outside = premiums.filter((p) => p >= 5000);
  expect(
    outside,
    `"Under ₹5,000" returned premiums of ${outside.join(', ')}`,
  ).toHaveLength(0);
});


test('product detail matches the listing', async ({ page }) => {
  const insurance = new InsurancePage(page);
  await insurance.goto();

  const code = 'FSLIFE002';
  const listedPremium = await insurance.premiumFor(code);
  const listedCoverage = await insurance.coverageFor(code);

  await insurance.detailsLink(code).click();

  const details = new InsuranceDetailsPage(page);
  await expect(details.root).toBeVisible();

  expect(
    await details.premiumValue(),
    `Premium differs between listing (${listedPremium}) and detail page`,
  ).toBeCloseTo(listedPremium, 2);

  expect(
    await details.coverageValue(),
    `Coverage differs between listing (${listedCoverage}) and detail page`,
  ).toBeCloseTo(listedCoverage, 2);
});

test('detail page states an eligible age range', async ({ page }) => {
  const details = new InsuranceDetailsPage(page);
  await details.goto(2);

  const range = await details.eligibleAgeRange();

  expect(range, 'No eligible age range shown on the product').not.toBeNull();
  expect(range.min).toBeGreaterThan(0);
  expect(
    range.max,
    `Eligible age range is ${range.min} to ${range.max}, which is backwards`,
  ).toBeGreaterThan(range.min);
});

test('FS-03 applicant outside the eligible age range is refused', async ({ page }) => {
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

test('FS-15 insurance purchase creates a policy and a transaction @smoke', async ({ page }) => {
  const insurance = new InsurancePage(page);
  await insurance.goto();

  // Pick a product and note its advertised premium.
  const code = 'FSTRVL007';           // Travel Guard, ₹1,800
  const advertised = await insurance.premiumFor(code);

  await insurance.buyLink(code).click();

  const buy = new BuyInsurancePage(page);
  await expect(page).toHaveURL(/buy-insurance/);

  // The premium must survive the move from listing to purchase form.
  const onForm = await buy.productPremiumValue();
  expect(
    onForm,
    `Premium was ${advertised} on the listing and ${onForm} on the purchase form`,
  ).toBeCloseTo(advertised, 2);

  const unique = Date.now().toString().slice(-6);
  await buy.fillApplication({
    dob: '1990-01-01',
    nomineeName: `QA Nominee ${unique}`,
    relationship: 'Spouse',
    accept: true,
  });
  await buy.submit();

  expect(await buy.wasRejected(), 'A valid purchase was rejected').toBe(false);

  // The purchase should appear as a Premium Payment for the right amount.
  const transactions = new TransactionsPage(page);
  await transactions.goto();
  await transactions.applyFilters({ type: 'Premium Payment' });

  const products = await transactions.listedProducts();
  expect(
    products.some((p) => p.includes('Travel Guard')),
    `No Premium Payment transaction found for Travel Guard. Found: ${products.join(', ')}`,
  ).toBe(true);
});

test('FS-04 applicant below the minimum eligible age is refused', async ({ page }) => {
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

test('policy statuses use documented values', async ({ page }) => {
  const policies = new PoliciesPage(page);
  await policies.goto();

  const statuses = await policies.listedStatuses();
  expect(statuses.length, 'No policies listed').toBeGreaterThan(0);

  const unexpected = statuses.filter((s) => !PoliciesPage.STATUSES.includes(s));
  expect(
    unexpected,
    `Policies listed with undocumented statuses: ${unexpected.join(', ')}`,
  ).toHaveLength(0);
});

test('policy premium matches the product it was bought from', async ({ page }) => {
  const insurance = new InsurancePage(page);
  await insurance.goto();
  const advertised = await insurance.premiumFor('FSLIFE002');

  const policies = new PoliciesPage(page);
  await policies.goto();

  const all = await policies.allPolicies();
  const matching = all.filter((p) => p.product.includes('Secure Future'));

  expect(matching.length, 'No policies found for that product').toBeGreaterThan(0);

  const wrong = matching.filter((p) => Math.abs(p.premium - advertised) > 0.01);
  expect(
    wrong,
    `${wrong.length} policies carry a premium other than the advertised ${advertised}: ` +
    wrong.map((p) => `${p.number} at ${p.premium}`).join(', '),
  ).toHaveLength(0);
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