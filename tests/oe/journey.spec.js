const { test, expect } = require('@playwright/test');
const { OeLoginPage } = require('../../pages/oe/OeLoginPage');
const { OeDashboardPage } = require('../../pages/oe/OeDashboardPage');
const { OeClientPage } = require('../../pages/oe/OeClientPage');
const { OeAddressPage } = require('../../pages/oe/OeAddressPage');
const { OeKycPage } = require('../../pages/oe/OeKycPage');
const { OeProductPage } = require('../../pages/oe/OeProductPage');
const { OeRidersPage } = require('../../pages/oe/OeRidersPage');
const { OeBeneficiaryPage } = require('../../pages/oe/OeBeneficiaryPage');
const { OeDocumentsPage } = require('../../pages/oe/OeDocumentsPage');
const { OeReviewPage } = require('../../pages/oe/OeReviewPage');

// Order Entry runs on a different port to FinServe, so the saved
// FinServe session does not apply here.
test.use({ storageState: { cookies: [], origins: [] } });

test('OE-19 agent captures and submits a complete application @smoke', async ({ page }) => {
  test.setTimeout(180000);

  const unique = Date.now().toString().slice(-5);
  const ELITE = '3';
  const SUM_ASSURED = 1000000;

  const login = new OeLoginPage(page);
  await login.goto();
  await login.login(process.env.OE_AGENT_EMAIL, process.env.OE_AGENT_PASSWORD);

  // Create a fresh draft, so this journey does not depend on existing data.
  const dashboard = new OeDashboardPage(page);
  await dashboard.goto();
  const countsBefore = await dashboard.counts();

  await dashboard.startNewApplication();
  await expect(page).toHaveURL(/applications\/\d+\/client/);

  const applicationId = page.url().match(/applications\/(\d+)/)[1];
  console.log('Journey created application', applicationId);

  // --- client ---
  const client = new OeClientPage(page);
  await client.fill({
    firstName: `QA${unique}`,
    lastName: 'Journey',
    dob: '1985-06-15',
    gender: 'MALE',
    maritalStatus: 'SINGLE',
    nationality: 'United States',
    occupation: 'Engineer',
    employerName: 'Test Employer',
    employerAddress: '1 Test Street',
  });
  await client.save();

  // --- address and contact ---
  const address = new OeAddressPage(page);
  await address.fillResidential({
    street: '123 Main Street',
    city: 'Austin',
    state: 'TX',
    zip: '73301',
  });
  await address.copyResidentialToMailing();
  await address.fillContact({
    email: `qa${unique}@example.com`,
    mobile: '2125551212',
    mode: 'EMAIL',
  });
  await address.save();

  // --- kyc and compliance ---
  const kyc = new OeKycPage(page);

  // The application's option lists are the contract this step depends on.
  // Checking them here turns silent drift into an immediate, readable failure
  // instead of a three-minute timeout inside selectOption().
  const optionLabels = await kyc.readAllOptionLabels();
  expect(optionLabels.idType, 'ID Type options changed').toEqual(OeKycPage.ID_TYPES);
  expect(optionLabels.sourceOfFunds, 'Source of Funds options changed').toEqual(OeKycPage.SOURCES);
  expect(optionLabels.riskProfile, 'Risk Profile options changed').toEqual(OeKycPage.RISK_PROFILES);
  expect(optionLabels.pep, 'PEP options changed').toEqual(OeKycPage.PEP_VALUES);

  await kyc.fill({
    idType: 'SSN',
    idNumber: '123456789',
    issueDate: '2020-01-01',
    expiryDate: '2030-01-01',
    annualIncome: '120000',
    netWorth: '500000',
    sourceOfFunds: 'SALARY',
    riskProfile: 'MODERATE',
    pep: 'No',
    declare: true,
  });
  await kyc.save();

  // --- product, with the premium checked against the published rate ---
  const product = new OeProductPage(page);
  await product.configure({
    productId: ELITE,
    sumAssured: SUM_ASSURED,
    frequency: 'MONTHLY',
    paymentTerm: '15',
  });

  const shownPremium = await product.premiumValue();
  const expectedPremium = OeProductPage.expectedPremium(ELITE, SUM_ASSURED, 'MONTHLY');
  expect(
    shownPremium,
    `Premium shown ${shownPremium} does not match the published rate figure ` +
    `${expectedPremium.toFixed(2)} for ${SUM_ASSURED} at 6.10 per 1,000 monthly`,
  ).toBeCloseTo(expectedPremium, 2);

  await product.save();

  // --- riders ---
  const riders = new OeRidersPage(page);
  await riders.select(['ADB001']);
  await riders.save();

  // --- beneficiaries, allocated in full ---
  const beneficiaries = new OeBeneficiaryPage(page);
  await beneficiaries.goto(applicationId);
  await beneficiaries.addBeneficiary({
    level: 'PRIMARY',
    type: 'INDIVIDUAL',
    relationship: 'SPOUSE',
    allocation: 100,
    designation: 'REVOCABLE',
    firstName: `Nominee${unique}`,
    lastName: 'Journey',
    dob: '1987-03-20',
  });

  const totals = await beneficiaries.allocationTotals();
  expect(
    totals.primary,
    `Primary allocation is ${totals.primary}% after saving a single beneficiary at 100%`,
  ).toBeCloseTo(100, 2);

  // --- documents ---
  const documents = new OeDocumentsPage(page);
  await documents.goto(applicationId);
  await documents.uploadSimulated({
    type: 'KYC_ID',
    fileName: `journey-${unique}.pdf`,
  });
  expect(
    await documents.documentCount(),
    'The uploaded document was not recorded',
  ).toBeGreaterThan(0);

  // --- review ---
  const review = new OeReviewPage(page);
  await review.goto(applicationId);
  await review.runValidation();

  const errors = await review.blockingErrors();
  expect(
    errors,
    `A completed application still reports blocking errors: ${errors.join(', ')}`,
  ).toHaveLength(0);

  const age = await review.ageValue();
  expect(age, 'Calculated age is not a sensible number').toBeGreaterThan(0);

  expect(
    await review.canSubmit(),
    'Submit is disabled on an application with no blocking errors',
  ).toBe(true);

  // --- submit ---
  await review.submit();

  expect(await review.wasSubmitted(), 'The confirmation page was not reached').toBe(true);

  const reference = await review.submissionReference();
  expect(
    reference,
    `Submission reference "${reference}" does not look like a generated reference`,
  ).toMatch(/^WL\d+$/);

  // --- and the dashboard reflects it ---
  await dashboard.goto();
  const countsAfter = await dashboard.counts();

  expect(
    countsAfter.submitted,
    `Submitted count was ${countsBefore.submitted} before and ${countsAfter.submitted} after`,
  ).toBe(countsBefore.submitted + 1);
});