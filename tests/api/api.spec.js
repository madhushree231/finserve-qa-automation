const { test, expect } = require('@playwright/test');
const { ApiClient } = require('../../utils/apiClient');

const CATEGORIES = ['Equity Fund', 'Debt Fund', 'Hybrid Fund', 'Index Fund', 'ELSS'];
const RISKS = ['Low', 'Moderate', 'High', 'Very High'];
const STATUSES = ['SUCCESS', 'PENDING', 'FAILED', 'CANCELLED'];
const TYPES = ['Investment', 'Redemption', 'Premium Payment', 'Refund', 'Failed Payment'];

/**
 * Checks that a response is usable before anything reads into it.
 *
 * /portfolio intermittently returns HTTP 500 in this environment. Without this
 * guard the tests below reach straight into body.data and throw a TypeError,
 * which hides the real cause and makes an environment fault indistinguishable
 * from a data defect.
 */
function expectPayload(status, body, endpoint) {
  expect(
    status,
    `GET ${endpoint} returned HTTP ${status}. Body: ${JSON.stringify(body).slice(0, 300)}`,
  ).toBe(200);

  expect(
    body && body.data,
    `GET ${endpoint} returned HTTP 200 with no data payload. `
    + `Body: ${JSON.stringify(body).slice(0, 300)}`,
  ).toBeTruthy();

  return body.data;
}

test.describe('API authentication', () => {
  test('FS-19 request without a key is refused', async () => {
    const api = await ApiClient.create({ noAuth: true });
    const { status, body } = await api.get('/mutual-funds');
    expect(status, `Expected 401, got ${status}`).toBe(401);
    expect(body.status ?? body.message).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain('fund_code');
    await api.dispose();
  });

  test('FS-20 request with a wrong key is refused', async () => {
    const api = await ApiClient.create({ apiKey: 'invalid-key-000' });
    const { status, body } = await api.get('/mutual-funds');
    expect(status, `Expected 401, got ${status}`).toBe(401);
    expect(
      ['Unauthorized', 'Unauthenticated.'],
      `Unexpected message: ${body.message}`,
    ).toContain(body.message);
    await api.dispose();
  });

  test('health endpoint returns the standard envelope', async () => {
    const api = await ApiClient.create();
    const { status, body } = await api.get('/health');
    const data = expectPayload(status, body, '/health');
    expect(body.status).toBe('success');
    expect(data.api_version).toBe('v1');
    await api.dispose();
  });
});

test.describe('API data contracts', () => {
  let api;

  test.beforeAll(async () => { api = await ApiClient.create(); });
  test.afterAll(async () => { await api.dispose(); });

  test('FS-21 fund list returns the documented shape', async () => {
    const { status, body } = await api.get('/mutual-funds');
    const funds = expectPayload(status, body, '/mutual-funds');

    expect(Array.isArray(funds), 'Fund list is not an array').toBe(true);
    expect(funds.length, 'Fund list is empty').toBeGreaterThan(0);

    for (const fund of funds) {
      expect(typeof fund.fund_code, `fund ${fund.id}`).toBe('string');
      expect(typeof fund.nav, `fund ${fund.fund_code}`).toBe('number');
      expect(typeof fund.minimum_lumpsum, `fund ${fund.fund_code}`).toBe('number');
      expect(typeof fund.minimum_sip, `fund ${fund.fund_code}`).toBe('number');
      expect(CATEGORIES, `fund ${fund.fund_code} category`).toContain(fund.category);
      expect(RISKS, `fund ${fund.fund_code} risk level`).toContain(fund.risk_level);
    }
  });

  test('FS-22 transactions use documented types and statuses', async () => {
    const { status, body } = await api.get('/transactions');
    const transactions = expectPayload(status, body, '/transactions');

    expect(Array.isArray(transactions), 'Transaction list is not an array').toBe(true);

    for (const txn of transactions) {
      expect(STATUSES, txn.transaction_reference).toContain(txn.status);
      expect(TYPES, txn.transaction_reference).toContain(txn.transaction_type);
      expect(txn.transaction_reference).toMatch(/^TXN-/);
    }
  });

  test('FS-24 portfolio total equals the sum of its holdings', async () => {
    const { status, body } = await api.get('/portfolio');
    const data = expectPayload(status, body, '/portfolio');

    const { summary, holdings } = data;
    expect(summary, '/portfolio returned no summary').toBeTruthy();
    expect(Array.isArray(holdings), '/portfolio returned no holdings array').toBe(true);
    expect(holdings.length, '/portfolio returned an empty holdings array').toBeGreaterThan(0);

    const computed = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const rounded = Math.round(computed * 100) / 100;

    expect(
      summary.sum_of_holding_values,
      `sum_of_holding_values is ${summary.sum_of_holding_values} but the `
      + `${holdings.length} holdings add to ${rounded}.`,
    ).toBeCloseTo(rounded, 2);

    // The reported total is what the customer is shown as their net worth.
    expect(
      summary.reported_portfolio_total,
      `Reported total ${summary.reported_portfolio_total} does not match the sum of `
      + `${holdings.length} holdings (${rounded}). Difference of `
      + `${(summary.reported_portfolio_total - rounded).toFixed(2)}.`,
    ).toBeCloseTo(rounded, 2);
  });

  test('FS-23 each holding gain equals current value minus invested', async () => {
    const { status, body } = await api.get('/portfolio');
    const data = expectPayload(status, body, '/portfolio');

    const { holdings } = data;
    expect(Array.isArray(holdings), '/portfolio returned no holdings array').toBe(true);
    expect(holdings.length, '/portfolio returned an empty holdings array').toBeGreaterThan(0);

    for (const h of holdings) {
      const expected = Math.round((h.current_value - h.invested_amount) * 100) / 100;
      expect(
        h.gain_loss,
        `Holding ${h.folio_number}: gain_loss is ${h.gain_loss} but current value `
        + `${h.current_value} minus invested ${h.invested_amount} is ${expected}.`,
      ).toBeCloseTo(expected, 2);
    }
  });
});