const { test, expect } = require('@playwright/test');
const { OeLoginPage } = require('../../pages/oe/OeLoginPage');
const { OeDashboardPage } = require('../../pages/oe/OeDashboardPage');

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  const login = new OeLoginPage(page);
  await login.goto();
  await login.login(process.env.OE_AGENT_EMAIL, process.env.OE_AGENT_PASSWORD);
});

test('OE-04 dashboard shows all five status tiles', async ({ page }) => {
  const dashboard = new OeDashboardPage(page);
  await dashboard.goto();

  const counts = await dashboard.counts();

  for (const [name, value] of Object.entries(counts)) {
    expect(Number.isInteger(value), `${name} tile is not a number`).toBe(true);
    expect(value, `${name} tile is negative`).toBeGreaterThanOrEqual(0);
  }
});

test('application statuses use documented values', async ({ page }) => {
  const dashboard = new OeDashboardPage(page);
  await dashboard.goto();

  const statuses = await dashboard.listedStatuses();
  expect(statuses.length, 'No applications listed').toBeGreaterThan(0);

  const unexpected = statuses.filter(
    (s) => !OeDashboardPage.STATUSES.includes(s.toUpperCase()),
  );
  expect(
    unexpected,
    `Applications listed with undocumented statuses: ${unexpected.join(', ')}`,
  ).toHaveLength(0);
});

test('OE-05 tile counts agree with the full application list', async ({ page }) => {
  const dashboard = new OeDashboardPage(page);
  await dashboard.goto();
  const counts = await dashboard.counts();

  // The dashboard table is only recent applications, so count the full list.
  await dashboard.gotoApplicationsList();
  const all = await dashboard.listedApplications();

  const drafts = all.filter((a) => a.status.toUpperCase() === 'DRAFT').length;
  const submitted = all.filter((a) => a.status.toUpperCase() === 'SUBMITTED').length;

  expect(
    drafts,
    `Draft tile says ${counts.draft} but the list contains ${drafts} drafts`,
  ).toBe(counts.draft);

  expect(
    submitted,
    `Submitted tile says ${counts.submitted} but the list contains ${submitted}`,
  ).toBe(counts.submitted);
});

test('submitted applications carry a generated reference', async ({ page }) => {
  const dashboard = new OeDashboardPage(page);
  await dashboard.goto();

  const all = await dashboard.listedApplications();
  const submitted = all.filter((a) => a.status.toUpperCase() === 'SUBMITTED');

  test.skip(submitted.length === 0, 'No submitted applications to check');

  for (const app of submitted) {
    expect(
      app.reference,
      `Submitted application still shows a draft reference: ${app.reference}`,
    ).not.toMatch(/^Draft #/);
  }
});

test('every application status has a matching dashboard tile', async ({ page }) => {
  const dashboard = new OeDashboardPage(page);
  await dashboard.goto();
  const counts = await dashboard.counts();

  await dashboard.gotoApplicationsList();
  const all = await dashboard.listedApplications();

  const tiled = ['DRAFT', 'SUBMITTED', 'UNDER REVIEW', 'APPROVED', 'REQUIRES INFO'];
  const untiled = all
    .map((a) => a.status.toUpperCase())
    .filter((s) => !tiled.includes(s));

  const unique = [...new Set(untiled)];

  expect(
    unique,
    `Applications exist with statuses that no dashboard tile counts: ${unique.join(', ')}. ` +
    `An agent viewing the dashboard would not see them.`,
  ).toHaveLength(0);
});