/**
 * Authentication has no component directory of its own — it lives in
 * app/services/auth.service.js, the route guard in app/app.js, and an inline
 * login template in app/app.routes.js. This page object therefore works across
 * whichever screen a scenario happens to be on.
 *
 * FRONT-DOOR ASYMMETRY (Increment 3). A migrated route is a REAL PATH
 * (`/itinerary`); an unmigrated one is a FRAGMENT under `/` (`/#!/expenses`),
 * and a fragment is never sent to the server. Navigating by hash therefore
 * reaches the AngularJS screen even for a route React now owns — which is how
 * two 401 scenarios silently kept testing the legacy behaviour.
 *
 * So navigation always uses the real path and lets the front door decide: it
 * serves React for a migrated row and 302s to the `legacyHash` form otherwise.
 * `currentState()` reads whichever of the two forms it ends up in.
 */
const { BASE_URL: BASE } = require('../support/world');

/**
 * Routes React owns. Kept in step with `src/lib/route-ledger.ts`: a route joins
 * this set in the increment that migrates it.
 */
const REACT_PATHS = new Set(['flights', 'hotels', 'itinerary']);

const STATES = {
  login: '#!/login',
  dashboard: '#!/dashboard',
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

  /**
   * A migrated route is addressed by its real path; an unmigrated one by its
   * fragment, exactly as before.
   *
   * The distinction is not cosmetic. Hash navigation between two legacy states
   * is a SAME-DOCUMENT navigation — the AngularJS app is not reloaded, so
   * `$rootScope.currentUser` survives, and two scenarios depend on that.
   * Addressing a legacy route by real path would 302 and reboot the app,
   * quietly changing what those scenarios measure.
   */
  async goToState(name) {
    const target = REACT_PATHS.has(name) ? '/' + name : '/' + (STATES[name] || '#!/' + name);
    await this.page.goto(BASE + target, { waitUntil: 'domcontentloaded' });
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
    return this.currentState() === 'login';
  }

  /**
   * The area currently on screen, in whichever form the front door left the
   * URL: `#!/expenses` for a legacy route, `/itinerary` for a migrated one.
   */
  currentState() {
    const url = this.page.url();
    const hash = /#!\/([^?]*)/.exec(url);
    if (hash) return hash[1];
    const path = /^https?:\/\/[^/]+\/([^?#]*)/.exec(url);
    return path ? path[1] : '';
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

module.exports = { AuthPage, BASE };
