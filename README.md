# FinServe QA Automation

Playwright suite covering the FinServe Retail Demo Platform and the Insurance
Order Entry Demo Platform, built for the TalentFarm QA Automation Lab.

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

## Running

    npm test                 # everything
    npm run test:api         # API layer only
    npm run test:smoke       # critical path, both browsers
    npm run test:headed      # watch it run
    npm run report           # open the last HTML report

## Structure

    pages/       one page object per screen, all locators live here
      oe/        Insurance Order Entry page objects
    tests/       specs grouped by area
      api/       API layer
      oe/        Insurance Order Entry
    utils/       API client and shared helpers

Sign-in happens once in `tests/auth.setup.js` and the session is reused, so
tests do not repeat the login. Tests that exercise the login form itself
override this with an empty storage state.

## Design decisions

**Locators live only in page objects.** No spec file contains a selector, so a
UI change is fixed in one place.

**Records are addressed by business identifier.** The applications expose
parameterised test ids such as `fund-card-{fundCode}` and
`transaction-row-{reference}`, so tests target a specific record rather than
whichever happens to be first. This matters because the environment is shared
and other learners change the seed data during a run.

**Boundary values are read from the application.** Minimum investment differs
per fund, so `FS-08` reads the fund's own minimum and subtracts one rather
than hardcoding a threshold that would be wrong for most funds.

**Premium is computed, not hardcoded.** The Order Entry pricing table is held
in `OeProductPage.PRODUCTS`, so premium tests assert against a calculated
figure and would catch a pricing change.

**Assertions name the business rule.** Failure messages read like
"Reported total 62005.10 does not match the sum of 4 holdings (61006.10)"
rather than "expected true to be false".

## Known failures

**FS-24 portfolio total.** The portfolio API reports a total higher than the
sum of its own holdings. The gap held at exactly 999.00 across totals of
67,005 / 77,005 / 87,005 / 102,005, so it is a fixed offset rather than a
rounding error. The UI shows the correct figure, so the two channels disagree.

## Observed during testing

**FS-18 transaction status.** `TXN-QA-FAIL-001` is a Failed Payment. The API
reported status FAILED while the transactions screen showed SUCCESS. This
failed in some runs and passed in others with no code change, indicating the
defect is toggled server-side during a session.

**OE-03 sum assured.** A sum assured below the product minimum appeared to be
accepted and priced during the study phase. It did not reproduce in testing;
the application refused it correctly. The test is kept as a regression check.

**Seeded defect flag.** The Order Entry product page contains a
`seededProd001Active` flag, labelled in the page source as "premium did not
update after frequency change". It was false when tested.

Seeded defects appear to be toggled during a session, so a single run
describes the state of the environment at that moment rather than a permanent
result.

## Not covered

Order Entry is covered at login and product configuration only. The full
application wizard, from address and contact through to submission, is not
automated. The mandated coverage table in the evaluation document is
FinServe-only, so effort went to the flows it names plus the highest-risk
Order Entry steps.

## Environment notes

The lab environment intermittently returned HTTP 500 on `/portfolio` during
testing. One retry is configured, so affected tests report as flaky rather
than failed.

`tests/oe/product.spec.js` uses a hardcoded application id. Update
`APPLICATION_ID` to a draft that exists in your environment.
