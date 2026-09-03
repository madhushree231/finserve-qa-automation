const { test, expect } = require('@playwright/test');
const { OeLoginPage } = require('../../pages/oe/OeLoginPage');
const { OeBeneficiaryPage } = require('../../pages/oe/OeBeneficiaryPage');
const { OeClientPage } = require('../../pages/oe/OeClientPage');
const { OeReviewPage } = require('../../pages/oe/OeReviewPage');

test.use({ storageState: { cookies: [], origins: [] } });

// A complete application carrying a beneficiary allocation below 100%.
const APPLICATION_ID = 49;

test.beforeEach(async ({ page }) => {
  const login = new OeLoginPage(page);
  await login.goto();
  await login.login(process.env.OE_AGENT_EMAIL, process.env.OE_AGENT_PASSWORD);
});

test('OE-14 allocation below 100% must block submission', async ({ page }) => {
  const beneficiaries = new OeBeneficiaryPage(page);
  await beneficiaries.goto(APPLICATION_ID);

  const totals = await beneficiaries.allocationTotals();
  test.skip(
    totals.primary >= 100,
    `Primary allocation is ${totals.primary}%, so this rule cannot be exercised here`,
  );

  const review = new OeReviewPage(page);
  await review.goto(APPLICATION_ID);
  await review.runValidation();

  const errors = await review.blockingErrors();

  expect(
    errors.join(' ').toLowerCase(),
    `Primary allocation is ${totals.primary}% but validation raised no allocation error. ` +
    `Errors: ${errors.join(', ') || '(none)'}`,
  ).toContain('allocation');
});

test('OE-15 submit is disabled while allocation is incomplete', async ({ page }) => {
  const beneficiaries = new OeBeneficiaryPage(page);
  await beneficiaries.goto(APPLICATION_ID);
  const totals = await beneficiaries.allocationTotals();

  test.skip(totals.primary >= 100, 'Allocation is complete on this application');

  const review = new OeReviewPage(page);
  await review.goto(APPLICATION_ID);
  await review.runValidation();

  expect(
    await review.canSubmit(),
    `Submit is enabled with primary allocation at only ${totals.primary}%. ` +
    `The remaining ${100 - totals.primary}% of the benefit has no named recipient.`,
  ).toBe(false);
});

test('OE-16 calculated age matches the date of birth entered', async ({ page }) => {
  const client = new OeClientPage(page);
  await client.goto(APPLICATION_ID);

  const dob = await client.dateOfBirth.inputValue();
  test.skip(!dob, 'No date of birth recorded on this application');

  // Age as of today, counting whether this year's birthday has passed.
  const born = new Date(dob);
  const today = new Date();
  let expected = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) {
    expected -= 1;
  }

  const review = new OeReviewPage(page);
  await review.goto(APPLICATION_ID);
  const shown = await review.ageValue();

  expect(
    shown,
    `Date of birth ${dob} gives an age of ${expected} today, ` +
    `but the application shows ${shown}.`,
  ).toBe(expected);
});