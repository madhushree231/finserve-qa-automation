const { test, expect } = require('@playwright/test');
const { OeLoginPage } = require('../../pages/oe/OeLoginPage');

// Order Entry is a separate app on a different port, so the saved
// FinServe session does not apply.
test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: 'serial' });

test('OE-01 approved agent signs in', async ({ page }) => {
  const login = new OeLoginPage(page);
  await login.goto();
  await login.login('agent.valid@insurance.test', process.env.TEST_PASSWORD);

  await expect(page).not.toHaveURL(/login/);
});

test('login page offers registration and password reset', async ({ page }) => {
  const login = new OeLoginPage(page);
  await login.goto();

  await expect(login.registerLink).toBeVisible();
  await expect(login.forgotPasswordLink).toBeVisible();
});
