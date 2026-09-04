const { test: setup, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');

const authFile = 'playwright/.auth/customer.json';

/**
 * Signs in once and saves the session, so the other tests do not
 * repeat the login. Runs before every project via `dependencies`.
 */
setup('authenticate as customer', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('qauser@finserve.test', process.env.TEST_PASSWORD);

  await expect(page).toHaveURL(/dashboard/);
  await page.context().storageState({ path: authFile });
});
