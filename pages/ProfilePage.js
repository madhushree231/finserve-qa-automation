class ProfilePage {
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('profile-page');

    this.name = page.getByTestId('profile-name');
    this.email = page.getByTestId('profile-email');
    this.mobile = page.getByTestId('profile-mobile');
    this.pan = page.getByTestId('profile-pan');
    this.kycStatus = page.getByTestId('profile-kyc-status');
    this.accountStatus = page.getByTestId('profile-account-status');
    this.learnerCode = page.getByTestId('profile-learner-code');
  }

  async goto() {
    await this.page.goto('/profile');
  }

  async details() {
    return {
      name: (await this.name.innerText()).trim(),
      email: (await this.email.innerText()).trim(),
      mobile: (await this.mobile.innerText()).trim(),
      pan: (await this.pan.innerText()).trim(),
      kycStatus: (await this.kycStatus.innerText()).trim(),
      accountStatus: (await this.accountStatus.innerText()).trim(),
    };
  }
}

module.exports = { ProfilePage };