const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');

// These tests drive the login form, so they must start signed out.
test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: 'serial' });

test('customer can sign in', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('qauser@finserve.test', process.env.TEST_PASSWORD);

  await expect(page).toHaveURL(/dashboard/);
});

test('wrong password is refused', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('qauser@finserve.test', 'WrongPass@999');

  await expect(page).toHaveURL(/login/);
  await expect(loginPage.errorMessage).toBeVisible();
});

test('FS-03 locked account cannot sign in', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('locked@finserve.test', process.env.TEST_PASSWORD);

  await expect(
    page,
    'A locked account reached the dashboard. It must never authenticate.',
  ).toHaveURL(/login/);
  await expect(loginPage.errorMessage).toBeVisible();
});

test('newuser sees empty states rather than errors', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('newuser@finserve.test', process.env.TEST_PASSWORD);

  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
});
