const { test, expect } = require('@playwright/test');
const { ProfilePage } = require('../pages/ProfilePage');

const KYC_STATUSES = ['VERIFIED', 'PENDING', 'REJECTED'];
const ACCOUNT_STATUSES = ['ACTIVE', 'LOCKED'];


test('PAN is masked, not shown in full', async ({ page }) => {
  const profile = new ProfilePage(page);
  await profile.goto();

  const pan = (await profile.pan.innerText()).trim();

  // A full Indian PAN is five letters, four digits, one letter.
  expect(
    pan,
    `PAN is displayed as "${pan}", which matches a full unmasked PAN. ` +
    `It should be masked.`,
  ).not.toMatch(/^[A-Z]{5}\d{4}[A-Z]$/);

  expect(pan, `PAN "${pan}" contains no masking characters`).toContain('*');

  // Nothing resembling a full PAN anywhere in the page source either.
  const html = await page.content();
  const exposed = html.match(/[A-Z]{5}\d{4}[A-Z]/g) || [];
  expect(
    exposed,
    `Page source contains what looks like an unmasked PAN: ${exposed.join(', ')}`,
  ).toHaveLength(0);
});

test('KYC and account status use documented values', async ({ page }) => {
  const profile = new ProfilePage(page);
  await profile.goto();

  const details = await profile.details();

  expect(
    KYC_STATUSES,
    `KYC status "${details.kycStatus}" is not one of the documented values`,
  ).toContain(details.kycStatus);

  expect(
    ACCOUNT_STATUSES,
    `Account status "${details.accountStatus}" is not one of the documented values`,
  ).toContain(details.accountStatus);
});