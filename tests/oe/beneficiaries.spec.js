const { test, expect } = require('@playwright/test');
const { OeLoginPage } = require('../../pages/oe/OeLoginPage');
const { OeBeneficiaryPage } = require('../../pages/oe/OeBeneficiaryPage');

test.use({ storageState: { cookies: [], origins: [] } });

const APPLICATION_ID = 49;

test.beforeEach(async ({ page }) => {
  const login = new OeLoginPage(page);
  await login.goto();
  await login.login(process.env.OE_AGENT_EMAIL, process.env.OE_AGENT_PASSWORD);
});

test('OE-06 beneficiary type shows the matching detail panel', async ({ page }) => {
  const b = new OeBeneficiaryPage(page);
  await b.goto(APPLICATION_ID);

  await b.type.selectOption('TRUST');
  expect(await b.isSectionVisible('TRUST'), 'Trust panel not shown').toBe(true);
  expect(await b.isSectionVisible('INDIVIDUAL'), 'Individual panel still shown').toBe(false);

  await b.type.selectOption('ORGANIZATION');
  expect(await b.isSectionVisible('ORGANIZATION')).toBe(true);
  expect(await b.isSectionVisible('TRUST')).toBe(false);

  await b.type.selectOption('INDIVIDUAL');
  expect(await b.isSectionVisible('INDIVIDUAL')).toBe(true);
});

test('OE-07 trust beneficiary requires trust and trustee names', async ({ page }) => {
  const b = new OeBeneficiaryPage(page);
  await b.goto(APPLICATION_ID);

  await b.addBeneficiary({
    level: 'PRIMARY',
    type: 'TRUST',
    relationship: 'TRUST',
    allocation: 100,
  });

  expect(await b.wasRejected(), 'A trust beneficiary saved without its details').toBe(true);

  const errors = (await b.errors()).join(' ');
  expect(errors).toContain('Trust name is required');
  expect(errors).toContain('Trustee name is required');
});

test('OE-08 allocation must total one hundred percent', async ({ page }) => {
  const b = new OeBeneficiaryPage(page);
  await b.goto(APPLICATION_ID);

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

  const totals = await b.allocationTotals();

  // The rule may be enforced on save, or only at review.
  if (totals.primary > 0 && totals.primary < 100) {
    await b.clickContinue();
    // Continue is a link, so it may bypass the rule entirely.
    expect(
      page.url(),
      `Allocation totals ${totals.primary}% and the wizard still moved on to Documents. ` +
      `The 100% rule was not enforced at this step.`,
    ).not.toContain('/documents');
  }
});

test('allocation summary reflects what has been saved', async ({ page }) => {
  const b = new OeBeneficiaryPage(page);
  await b.goto(APPLICATION_ID);

  const totals = await b.allocationTotals();
  const saved = await b.listedBeneficiaries();

  const primarySum = saved
    .filter((x) => x.level.toUpperCase() === 'PRIMARY')
    .reduce((sum, x) => sum + Number.parseFloat(x.allocation), 0);

  expect(
    totals.primary,
    `Summary says ${totals.primary}% but the saved primary beneficiaries total ${primarySum}%`,
  ).toBeCloseTo(primarySum, 2);
});

