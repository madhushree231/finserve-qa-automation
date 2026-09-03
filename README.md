# FinServe QA Automation

Playwright suite covering the FinServe Retail Demo Platform and the Insurance
Order Entry Demo Platform, built for the TalentFarm QA Automation Lab.

53 tests across both applications. 43 pass, 8 fail against confirmed
application defects, 2 skip when their preconditions are not met by the
shared test data.

## Setup

    npm install
    npx playwright install chromium firefox

Copy `.env.example` to `.env` and fill in the values. The lab VM address
changes between sessions, so this is the only file that needs updating:

    FINSERVE_URL=http://<vm-ip>:8082
    ORDERENTRY_URL=http://<vm-ip>:8081
    API_URL=http://<vm-ip>:8082/api
    API_KEY=qa-demo-token-123
    TEST_PASSWORD=Password@123
    OE_AGENT_EMAIL=<order entry agent email>
    OE_AGENT_PASSWORD=<order entry agent password>

## Running

    npm test                          # everything
    npm run test:api                  # API layer only
    npx playwright test tests/oe      # Insurance Order Entry only
    npx playwright test -g "FS-33"    # one test by id
    npm run report                    # open the last HTML report

Use `--workers=1` for a clean run. The applications share seeded data, so
parallel workers can change values that other tests are reading.

## Structure

    pages/       one page object per screen, all locators live here
      oe/        Insurance Order Entry page objects
    tests/       specs grouped by area
      api/       API layer
      oe/        Insurance Order Entry
    utils/       API client and currency parsing

Sign-in happens once in `tests/auth.setup.js` and the session is reused, so
tests do not repeat the login. Tests that exercise a login form override this
with an empty storage state.

## Design decisions

**Locators live only in page objects.** No spec file contains a selector, so a
markup change is fixed in one place.

**Records are addressed by business identifier.** Both applications expose
parameterised test ids such as `fund-card-{fundCode}` and
`transaction-row-{reference}`, so a test targets a specific record rather than
whichever happens to be first. This matters because the environment is shared
and other learners change the seed data during a run.

**Boundary values are read from the application.** Minimum investment differs
per fund, so the boundary test reads that fund's own minimum and subtracts one
rather than hardcoding a threshold that would be wrong for most funds. The
insurance eligibility tests read the published age range and derive a date of
birth just outside it.

**Calculations are verified against a computed expectation.** The Order Entry
pricing table lives in `OeProductPage.PRODUCTS`, so the premium test asserts
against a figure it works out rather than one it was told. The age test
computes the correct age from the date of birth on the form.

**Assertions name the business rule.** Failure messages read like "Reported
total 132005.18 does not match the sum of 4 holdings (131006.18). Difference
of 999.00" rather than "expected true to be false".

## Failing tests

Eight tests fail. Each one traces to a confirmed application defect and is
left failing deliberately, so that a fix will turn it green without any change
to the suite.

**FS-33** The portfolio API reports a total 999.00 higher than the sum of its
own holdings. Both figures appear in the same response. The gap held at
exactly 999.00 across five runs at different totals, so it is a fixed offset
rather than rounding. The UI shows the correct figure.

**FS-25 and FS-26** The insurance product page publishes an eligible age range
of 18 to 55, and the data model holds `eligibility_age_min` and
`eligibility_age_max`, but applicants aged 17 and 56 both completed purchase
and hold Active policies.

**OE-08, OE-11, OE-14 and OE-15** Beneficiary allocation below 100% is never
validated. A beneficiary saved at 60% passed review validation with no
blocking errors, and the application was submitted with reference
WL2026090364621. The remaining 40% of the benefit has no named recipient.

**OE-16** Calculated age is one year higher than the date of birth implies. A
date of birth of 1980-01-04 shows an age of 47 in September 2026, where 46 is
correct.

Two further findings are recorded in the defect log but are not represented by
a failing test in the final run: a Failed Payment transaction displayed as
SUCCESS, which appeared intermittently and had reverted by the time of the
final run, and the wizard navigation issue described below.

## Skipped tests

Two tests guard on a precondition and step aside when it is not met, rather
than failing for a reason unrelated to what they check. Both exercise valid
scenarios and pass against a suitable application. They skip because the Order
Entry tests share fixed application ids and the data moves on as tests run.

## Known limitations

**Order Entry tests share fixed application ids.** Tests reference specific
drafts rather than creating their own, so they are order dependent and can
skip or interfere when the underlying application changes state. Creating a
fresh draft per test would fix this and is the main improvement the suite
needs.

**Two failures were investigated and found to be automation issues rather than
defects.** OE-05 compared dashboard tiles against a table it could not read,
because the dashboard and the applications list use different test ids for the
same kind of table. OE-07 pointed at an application that had been submitted
and could no longer accept beneficiaries. Both were corrected.

**Seeded defects appear to be toggled server-side during a session.** One
transaction status defect failed in some runs and passed in others with no
code change. The Order Entry product page contains a `seededProd001Active`
flag, labelled in the page source as "premium did not update after frequency
change", which was false when tested. Results therefore describe the state of
the environment at the time of the run.

**Environment.** `/portfolio` intermittently returned HTTP 500 during testing,
so one retry is configured and affected tests report as flaky rather than
failed. Order Entry has no documented API layer, so its verification is
through the interface only.

## Coverage

FinServe is covered across authentication, dashboard, mutual funds,
investment, portfolio, redemption, insurance, policies, transactions, profile
and the fifteen documented API endpoints.

Order Entry is covered across authentication, the agent dashboard, product
configuration, beneficiaries, documents and review. The full nine step
application wizard is not automated end to end; the steps carrying the highest
risk were selected instead.

A smoke subset runs on Firefox as well as Chromium.
