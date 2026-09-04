const { test, expect } = require('@playwright/test');
const { OeLoginPage } = require('../../pages/oe/OeLoginPage');
const { OeDashboardPage } = require('../../pages/oe/OeDashboardPage');
const { OeBeneficiaryPage } = require('../../pages/oe/OeBeneficiaryPage');

// Order Entry runs on a different port to FinServe, so the saved
// FinServe session does not apply here.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * A fresh draft per test.
 *
 * These tests add beneficiaries and change allocation totals, so sharing one
 * application would let test order affect results and would leave a partial
 * allocation behind for the next test to read. A fixed id also expires: an
 * application that is later submitted stops accepting beneficiaries, which is
 * what previously made this file fail for reasons unrelated to beneficiaries.
 *
 * Navigating a brand new draft straight to the beneficiaries step works only
 * because wizard navigation is ungated, which is itself a reported defect.
 */
let applicationId;

test.beforeEach(async ({ page }) => {
  const login = new OeLoginPage(page);
  await login.goto();
  await login.login(process.env.OE_AGENT_EMAIL, process.env.OE_AGENT_PASSWORD);

  const dashboard = new OeDashboardPage(page);
  await dashboard.goto();
  applicationId = await dashboard.startNewApplication();
});

test('OE-06 beneficiary type shows the matching detail panel', async ({ page }) => {
  const b = new OeBeneficiaryPage(page);
  await b.goto(applicationId);

  // Individual is the default selection, so the panel should already be shown.
  await expect(b.individualSection, 'Individual panel not shown by default').toBeVisible();

  await b.fillBeneficiary({ type: 'TRUST' });
  await expect(b.trustSection, 'Trust panel not shown').toBeVisible();
  await expect(b.individualSection, 'Individual panel still shown').toBeHidden();
  await expect(b.organizationSection, 'Organization panel shown').toBeHidden();

  await b.fillBeneficiary({ type: 'ORGANIZATION' });
  await expect(b.organizationSection, 'Organization panel not shown').toBeVisible();
  await expect(b.trustSection, 'Trust panel still shown').toBeHidden();
  await expect(b.individualSection, 'Individual panel shown').toBeHidden();

  await b.fillBeneficiary({ type: 'INDIVIDUAL' });
  await expect(b.individualSection, 'Individual panel not restored').toBeVisible();
  await expect(b.trustSection, 'Trust panel still shown').toBeHidden();
  await expect(b.organizationSection, 'Organization panel still shown').toBeHidden();
});

test('OE-07 trust beneficiary requires trust and trustee names', async ({ page }) => {
  const b = new OeBeneficiaryPage(page);
  await b.goto(applicationId);

  await b.addBeneficiary({
    level: 'PRIMARY',
    type: 'TRUST',
    relationship: 'TRUST',
    allocation: 100,
  });

  const rejected = await b.wasRejected();
  const errors = await b.errors();
  const saved = await b.beneficiaryCount();

  // Report what the application actually did, so a failure is diagnosable
  // without opening the trace.
  expect(
    rejected,
    'A trust beneficiary was accepted with no trust name and no trustee name. '
    + `Saved beneficiaries: ${saved}. Errors shown: ${errors.length ? errors.join(' | ') : 'none'}.`,
  ).toBe(true);

  // Matched loosely on purpose. The exact wording of these messages has not
  // been observed, and the rule being enforced matters more than the copy.
  const combined = errors.join(' ').toLowerCase();
  expect(combined, `Errors shown: ${errors.join(' | ')}`).toContain('trust');
  expect(combined, `Errors shown: ${errors.join(' | ')}`).toContain('trustee');
});

test('OE-08 allocation must total one hundred percent', async ({ page }) => {
  const b = new OeBeneficiaryPage(page);
  await b.goto(applicationId);

  const unique = Date.now().toString().slice(-5);

  await b.addBeneficiary({
    level: 'PRIMARY',
    type: 'INDIVIDUAL',
    relationship: 'SPOUSE',
    allocation: 60,
    firstName: `QA${unique}`,
    lastName: 'Partial',
    dob: '1985-01-01',
  });

  // The beneficiary must actually have been saved before anything below is
  // meaningful. Without this the test can report green simply because the
  // save failed, which would hide the very defect it exists to demonstrate.
  const saved = await b.beneficiaryCount();
  expect(
    saved,
    'The 60% beneficiary was not saved, so the allocation rule was never exercised. '
    + `Errors shown: ${(await b.errors()).join(' | ') || 'none'}.`,
  ).toBeGreaterThan(0);

  const totals = await b.allocationTotals();
  expect(
    totals.primary,
    `Primary allocation is ${totals.primary}% after saving a single beneficiary at 60%.`,
  ).toBeCloseTo(60, 2);

  // The rule may be enforced on save or only at review. Neither happened here:
  // the application saved a partial allocation without complaint.
  await b.clickContinue();
  await page.waitForLoadState();

  expect(
    page.url(),
    `Primary allocation totals ${totals.primary}% and the wizard still moved on to Documents. `
    + 'The 100% rule was not enforced at this step.',
  ).not.toContain('/documents');
});