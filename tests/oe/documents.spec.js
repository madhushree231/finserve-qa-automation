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

test('document type offers the documented options', async ({ page }) => {
  const docs = new OeDocumentsPage(page);
  await docs.goto(APPLICATION_ID);

  const options = await docs.documentType.locator('option').allInnerTexts();
  const values = options.map((o) => o.trim());

  for (const type of OeDocumentsPage.TYPES) {
    expect(values, `Document type ${type} is missing`).toContain(type);
  }
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


const EMPTY_APPLICATION_ID = 42;

test('OE-13 application can reach review with no documents uploaded', async ({ page }) => {
  const docs = new OeDocumentsPage(page);
  await docs.goto(EMPTY_APPLICATION_ID);

  const count = await docs.documentCount();
  test.skip(count > 0, 'This application already has documents');

  await docs.clickContinueToReview();

  expect(
    page.url(),
    'An application with no supporting documents reached the review step',
  ).not.toContain('/review');
});