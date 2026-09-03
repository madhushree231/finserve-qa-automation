const { request } = require('@playwright/test');

/**
 * Wrapper over Playwright's request context.
 * Keeps the API key in one place so no test hardcodes a credential,
 * and builds full URLs rather than relying on baseURL joining.
 */
class ApiClient {
  constructor(ctx, headers) {
    this.ctx = ctx;
    this.headers = headers;
  }

  /**
   * @param {{apiKey?:string, noAuth?:boolean}} [opts]
   * @returns {Promise<ApiClient>}
   */
  static async create(opts = {}) {
    const headers = { Accept: 'application/json' };
    if (!opts.noAuth) {
      headers['X-API-Key'] = opts.apiKey ?? process.env.API_KEY;
    }
    const ctx = await request.newContext();
    return new ApiClient(ctx, headers);
  }

  url(path) {
    const base = (process.env.API_URL || '').replace(/\/$/, '');
    return `${base}/${path.replace(/^\//, '')}`;
  }

  /**
   * @param {string} path
   * @returns {Promise<{status:number, body:any}>}
   */
  async get(path) {
    const response = await this.ctx.get(this.url(path), { headers: this.headers });
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    return { status: response.status(), body };
  }

  async dispose() {
    await this.ctx.dispose();
  }
}

module.exports = { ApiClient };
