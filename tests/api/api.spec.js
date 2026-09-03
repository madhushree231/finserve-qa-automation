const { test, expect } = require('@playwright/test');
const { ApiClient } = require('../../utils/apiClient');

const CATEGORIES = ['Equity Fund', 'Debt Fund', 'Hybrid Fund', 'Index Fund', 'ELSS'];
const RISKS = ['Low', 'Moderate', 'High', 'Very High'];
const STATUSES = ['SUCCESS', 'PENDING', 'FAILED', 'CANCELLED'];
const TYPES = ['Investment', 'Redemption', 'Premium Payment', 'Refund', 'Failed Payment'];

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

    expect(status).toBe(401);
    expect(body.message).toBe('Unauthenticated.');

    await api.dispose();
  });

  test('health endpoint returns the standard envelope', async () => {
    const api = await ApiClient.create();
    const { status, body } = await api.get('/health');

    expect(status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.api_version).toBe('v1');

    await api.dispose();
  });
});

test.describe('API data contracts', () => {
  let api;

  test.beforeAll(async () => { api = await ApiClient.create(); });
  test.afterAll(async () => { await api.dispose(); });

  test('FS-21 fund list returns the documented shape', async () => {
    const { status, body } = await api.get('/mutual-funds');
    expect(status).toBe(200);

    const funds = body.data;
    expect(Array.isArray(funds)).toBe(true);
    expect(funds.length).toBeGreaterThan(0);

    for (const fund of funds) {
      expect(typeof fund.fund_code, `fund ${fund.id}`).toBe('string');
      expect(typeof fund.nav).toBe('number');
      expect(typeof fund.minimum_lumpsum).toBe('number');
      expect(typeof fund.minimum_sip).toBe('number');
      expect(CATEGORIES).toContain(fund.category);
      expect(RISKS).toContain(fund.risk_level);
    }
  });

  test('FS-22 transactions use documented types and statuses', async () => {
    const { status, body } = await api.get('/transactions');
    expect(status).toBe(200);

    for (const txn of body.data) {
      expect(STATUSES, txn.transaction_reference).toContain(txn.status);
      expect(TYPES, txn.transaction_reference).toContain(txn.transaction_type);
      expect(txn.transaction_reference).toMatch(/^TXN-/);
    }
  });

  test('FS-24 portfolio total equals the sum of its holdings', async () => {
    const { body } = await api.get('/portfolio');
    const { summary, holdings } = body.data;

    const computed = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const rounded = Math.round(computed * 100) / 100;

    expect(summary.sum_of_holding_values).toBeCloseTo(rounded, 2);

    // The reported total is what the customer is shown as their net worth.
    expect(
      summary.reported_portfolio_total,
      `Reported total ${summary.reported_portfolio_total} does not match the sum of ` +
      `${holdings.length} holdings (${rounded}). Difference of ` +
      `${(summary.reported_portfolio_total - rounded).toFixed(2)}.`,
    ).toBeCloseTo(rounded, 2);
  });

  test('each holding gain equals current value minus invested', async () => {
    const { body } = await api.get('/portfolio');

    for (const h of body.data.holdings) {
      const expected = Math.round((h.current_value - h.invested_amount) * 100) / 100;
      expect(h.gain_loss, h.folio_number).toBeCloseTo(expected, 2);
    }
  });
});
