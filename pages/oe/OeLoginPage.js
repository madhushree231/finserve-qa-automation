class OeLoginPage {
  constructor(page) {
    this.page = page;
    this.form = page.getByTestId('login-form');
    this.email = page.getByTestId('login-email-input');
    this.password = page.getByTestId('login-password-input');
    this.loginButton = page.getByTestId('login-submit-button');
    this.registerLink = page.getByTestId('agent-registration-link');
    this.forgotPasswordLink = page.getByTestId('forgot-password-link');
    this.demoHint = page.getByTestId('login-demo-hint');
    this.statusAlert = page.getByTestId('status-alert');
    this.errorMessage = page.locator('.invalid-feedback, .alert-danger');
  }

  /** Order Entry is on a different port, so the full URL is built here. */
  async goto() {
    await this.page.goto(`${process.env.ORDERENTRY_URL}/login`);
  }

  async login(email, password) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.loginButton.click();
  }

  async errorText() {
    const texts = await this.errorMessage.allInnerTexts();
    return texts.join(' | ').trim();
  }
}

module.exports = { OeLoginPage };
