/**
 * Authentication has no component directory of its own — it lives in
 * app/services/auth.service.js, the route guard in app/app.js, and an inline
 * login template in app/app.routes.js. This page object therefore works across
 * whichever screen a scenario happens to be on.
 */
const { BASE_URL: BASE } = require('../support/world');

const STATES = {
  login: '#!/login',
  dashboard: '#!/dashboard',
  flights: '#!/flights',
  hotels: '#!/hotels',
  itinerary: '#!/itinerary',
  'travel-request': '#!/travel-request',
  expenses: '#!/expenses'
};

class AuthPage {
  constructor(page) {
    this.page = page;
  }

  async openRoot() {
    await this.page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await this.settle();
  }

  async goToState(name) {
    const fragment = STATES[name] || '#!/' + name;
    await this.page.goto(BASE + '/' + fragment, { waitUntil: 'domcontentloaded' });
    await this.settle();
  }

  async settle() {
    await this.page.waitForTimeout(1400);
  }

  async reload() {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.settle();
  }

  url() {
    return this.page.url();
  }

  onLoginScreen() {
    return /#!\/login/.test(this.page.url());
  }

  currentState() {
    const match = /#!\/([^?]*)/.exec(this.page.url());
    return match ? match[1] : '';
  }

  /** The view content only — the navbar carries its own .container. */
  viewText() {
    return this.page.locator('[ui-view]').innerText();
  }

  bodyText() {
    return this.page.locator('body').innerText();
  }

  enterButton() {
    return this.page.getByRole('button', { name: 'Enter Portal' });
  }

  async enterPortal() {
    await this.enterButton().click();
    await this.page.waitForURL(/#!\/dashboard/, { timeout: 15000 });
    await this.settle();
  }

  loginInputs() {
    return this.page.locator('[ui-view] input, [ui-view] select, [ui-view] textarea').count();
  }

  async loginButtonNames() {
    return (await this.page.locator('[ui-view] button').allInnerTexts()).map((t) => t.trim());
  }

  navLinks() {
    return this.page.locator('nav.navbar a').allInnerTexts();
  }

  navText() {
    return this.page.locator('nav.navbar').innerText();
  }

  dashboardLinks() {
    return this.page.locator('[ui-view] a').allInnerTexts();
  }

  dashboardButtons() {
    return this.page.locator('[ui-view] button').allInnerTexts();
  }

  notifications() {
    return this.page.locator('.notification-area .alert').allInnerTexts();
  }

  // --- session -------------------------------------------------------------

  storedToken() {
    return this.page.evaluate(() => localStorage.getItem('authToken'));
  }

  storedKeys() {
    return this.page.evaluate(() => Object.keys(localStorage));
  }

  async plantToken(value) {
    // The token has to exist before the app bootstraps, otherwise the guard
    // has already bounced us. Land on the origin first, write, then navigate.
    await this.page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await this.page.evaluate((v) => localStorage.setItem('authToken', v), value);
  }

  clearToken() {
    return this.page.evaluate(() => localStorage.removeItem('authToken'));
  }

  decodeToken(token) {
    const parts = String(token).split('.');
    return {
      parts: parts.length,
      payload: JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
    };
  }

  /** Reach $rootScope through the injector, the way the legacy app does. */
  rootScope(fn) {
    return this.page.evaluate(
      (source) =>
        new Function(
          'rs',
          'return (' + source + ')(rs)'
        )(angular.element(document.body).injector().get('$rootScope')),
      fn.toString()
    );
  }

  signedInUser() {
    return this.rootScope((rs) => (rs.currentUser ? JSON.parse(JSON.stringify(rs.currentUser)) : null));
  }

  listenerCount(event) {
    return this.page.evaluate((name) => {
      const rs = angular.element(document.body).injector().get('$rootScope');
      return (rs.$$listeners[name] || []).filter(Boolean).length;
    }, event);
  }
}

module.exports = { AuthPage, STATES, BASE };
