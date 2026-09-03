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