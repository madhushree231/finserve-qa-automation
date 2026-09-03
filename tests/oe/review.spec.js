const { test, expect } = require('@playwright/test');
const { OeLoginPage } = require('../../pages/oe/OeLoginPage');
const { OeReviewPage } = require('../../pages/oe/OeReviewPage');

test.use({ storageState: { cookies: [], origins: [] } });

const APPLICATION_ID = 49;

test.beforeEach(async ({ page }) => {
  const login = new OeLoginPage(page);
  await login.goto();
  await login.login(process.env.OE_AGENT_EMAIL, process.env.OE_AGENT_PASSWORD);
});

test('OE-09 submit is disabled while blocking errors remain', async ({ page }) => {
  const review = new OeReviewPage(page);
  await review.goto(APPLICATION_ID);
  await review.runValidation();

  const errors = await review.blockingErrors();
  test.skip(errors.length === 0, 'This application has no blocking errors');

  expect(
    await review.canSubmit(),
    `Submit is enabled despite ${errors.length} blocking errors: ${errors.join(', ')}`,
  ).toBe(false);
});

test('OE-10 validation lists incomplete steps specifically', async ({ page }) => {
  const review = new OeReviewPage(page);
  await review.goto(APPLICATION_ID);
  await review.runValidation();

  const errors = await review.blockingErrors();
  test.skip(errors.length === 0, 'This application has no blocking errors');

  for (const error of errors) {
    expect(
      error.length,
      `Validation message is too vague to act on: "${error}"`,
    ).toBeGreaterThan(10);
  }
});

test('OE-11 beneficiary allocation below 100% is caught at review', async ({ page }) => {
  const review = new OeReviewPage(page);
  await review.goto(APPLICATION_ID);
  await review.runValidation();

  const errors = (await review.blockingErrors()).join(' ').toLowerCase();

  expect(
    errors,
    `Beneficiary allocation is below 100% but review validation does not mention it. ` +
    `Errors raised: ${errors || '(none)'}`,
  ).toContain('allocation');
});

test('snapshot reflects the application state', async ({ page }) => {
  const review = new OeReviewPage(page);
  await review.goto(APPLICATION_ID);

  const status = await review.status();
  expect(['DRAFT', 'SUBMITTED', 'UNDER REVIEW', 'APPROVED']).toContain(status);

  const age = await review.ageValue();
  expect(age, 'Calculated age is not a sensible number').toBeGreaterThan(0);
  expect(age).toBeLessThan(120);
});