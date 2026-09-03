class LoginPage {
  constructor(page) {
    this.page = page;
    this.email = page.getByTestId('login-email');
    this.password = page.getByTestId('login-password');
    this.loginButton = page.getByTestId('login-submit');
    this.errorMessage = page.locator('.field-error');
  }

  async goto() {
    await this.page.goto('/login');
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

module.exports = { LoginPage };
