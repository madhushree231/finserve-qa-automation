const { test, expect } = require('@playwright/test');
const { OeLoginPage } = require('../../pages/oe/OeLoginPage');
const { OeDocumentsPage } = require('../../pages/oe/OeDocumentsPage');

test.use({ storageState: { cookies: [], origins: [] } });

const APPLICATION_ID = 49;

test.beforeEach(async ({ page }) => {
  const login = new OeLoginPage(page);
  await login.goto();
  await login.login(process.env.OE_AGENT_EMAIL, process.env.OE_AGENT_PASSWORD);
});

test('OE-12 application can reach review with no documents uploaded', async ({ page }) => {
  const docs = new OeDocumentsPage(page);
  await docs.goto(APPLICATION_ID);

  const count = await docs.documentCount();
  test.skip(count > 0, 'This application already has documents');

  await docs.clickContinueToReview();

  expect(
    page.url(),
    'An application with no supporting documents reached the review step',
  ).not.toContain('/review');
});

test('a document can be recorded using only a simulated file name', async ({ page }) => {
  const docs = new OeDocumentsPage(page);
  await docs.goto(APPLICATION_ID);

  const before = await docs.documentCount();
  const unique = Date.now().toString().slice(-5);

  await docs.uploadSimulated({
    type: 'KYC_ID',
    fileName: `simulated-${unique}.pdf`,
  });

  const after = await docs.documentCount();

  expect(
    after,
    `A document was recorded with no file attached, only a typed name. ` +
    `Count went from ${before} to ${after}.`,
  ).toBeGreaterThan(before);
});