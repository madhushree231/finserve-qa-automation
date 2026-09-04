const { test, expect } = require('@playwright/test');
const { OeLoginPage } = require('../../pages/oe/OeLoginPage');
const { OeDashboardPage } = require('../../pages/oe/OeDashboardPage');

// Order Entry runs on a different port to FinServe, so the saved
// FinServe session does not apply here.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  const login = new OeLoginPage(page);
  await login.goto();
  await login.login(process.env.OE_AGENT_EMAIL, process.env.OE_AGENT_PASSWORD);
});

test('OE-04 dashboard shows all five status tiles', async ({ page }) => {
  const dashboard = new OeDashboardPage(page);
  await dashboard.goto();

  const tiles = [
    ['Draft', dashboard.draftTile],
    ['Submitted', dashboard.submittedTile],
    ['Under Review', dashboard.underReviewTile],
    ['Approved', dashboard.approvedTile],
    ['Requires Info', dashboard.requiresInfoTile],
  ];
  for (const [name, tile] of tiles) {
    await expect(tile, `${name} tile is not shown`).toBeVisible();
  }

  const counts = await dashboard.counts();
  for (const [name, value] of Object.entries(counts)) {
    expect(Number.isInteger(value), `${name} tile is not a number`).toBe(true);
    expect(value, `${name} tile is negative`).toBeGreaterThanOrEqual(0);
  }
});

/**
 * The summary tiles count every application. The dashboard panel shows only
 * recent ones, and the applications list is paginated, so neither can be
 * compared against a tile total: the earlier version of this test compared a
 * complete count against a single page of results and could not pass at any
 * figure.
 *
 * What the dashboard is actually accountable for is reflecting a change. A
 * newly created draft must appear in the recent panel as a draft, and the
 * draft tile must have gone up. Both survive pagination.
 *
 * The environment is shared, so other activity can raise the tile further
 * between the two reads. The assertion therefore checks that the count rose
 * by at least one rather than by exactly one, and pins the specific new
 * application by id so the test still proves that this draft was counted.
 */
test('OE-05 a new draft is reflected in the dashboard', async ({ page }) => {
  const dashboard = new OeDashboardPage(page);
  await dashboard.goto();
  const before = await dashboard.counts();

  const applicationId = await dashboard.startNewApplication();

  await dashboard.goto();
  const after = await dashboard.counts();

  await expect(
    dashboard.statusFor(applicationId),
    `Application ${applicationId} was created but does not appear on the dashboard`,
  ).toBeVisible();

  await expect(
    dashboard.statusFor(applicationId),
    `Application ${applicationId} was created but is not listed as a draft`,
  ).toHaveText('DRAFT');

  await expect(
    dashboard.openLink(applicationId),
    `No Open link for application ${applicationId}`,
  ).toBeVisible();

  expect(
    after.draft,
    `Draft tile was ${before.draft} before creating application ${applicationId} `
    + `and ${after.draft} after`,
  ).toBeGreaterThanOrEqual(before.draft + 1);

  expect(
    after.submitted,
    `Submitted tile changed from ${before.submitted} to ${after.submitted} `
    + 'after creating a draft',
  ).toBe(before.submitted);
});