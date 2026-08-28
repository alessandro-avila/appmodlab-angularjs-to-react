/**
 * Authentication page object — after the cutover.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE LARGEST SINGLE RE-POINT IN THE MIGRATION (plan §10.3)
 * ─────────────────────────────────────────────────────────────────────────
 * Through Increments 0-5 this file had to speak both stacks at once. It kept a
 * hash map for unmigrated routes, addressed migrated ones by real path, read
 * the view through AngularJS's `[ui-view]` and reached identity through the
 * `$rootScope` injector — because for five increments the answer genuinely
 * depended on which application was on screen.
 *
 * None of that is true any more. React owns every route, so:
 *   - every area is addressed by its real path; the `#!/` map is gone
 *   - the view is `[data-testid="shell-outlet"]`, React's outlet
 *   - identity comes from the store through the test seam
 *
 * `currentState()` still tolerates a `#!/` URL. That is deliberate and is NOT
 * legacy residue: ADR-012 §3 keeps the fragment in the address bar after a
 * legacy hash address lands on the portal root, so the harness must be able to
 * read a URL that still carries one.
 */
const { BASE_URL: BASE } = require('../support/world');

/** React's outlet. Replaces AngularJS's `[ui-view]` throughout. */
const VIEW = '[data-testid="shell-outlet"]';

class AuthPage {
  constructor(page) {
    this.page = page;
  }

  async openRoot() {
    await this.page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await this.settle();
  }

  /**
   * Every area is a real path now. The hash map that distinguished migrated
   * from unmigrated routes is gone with the application it existed for.
   */
  async goToState(name) {
    await this.page.goto(BASE + '/' + name, { waitUntil: 'domcontentloaded' });
    await this.settle();
  }

  /**
   * A legacy hash address, exactly as a user with an old bookmark would send
   * it. ADR-012 §3: the fragment is never transmitted, so this is a GET / that
   * lands on the portal root with the fragment left in the address bar.
   */
  async goToLegacyHash(fragment) {
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

  /**
   * Content-based, not URL-based.
   *
   * ADR-012 makes `/` render the login screen for a stranger rather than
   * redirecting to `/login`, so the URL alone can no longer answer this: a
   * visitor on `/`, on `/login`, and on `/#!/flights` are all on the login
   * screen while showing three different addresses.
   */
  async onLoginScreen() {
    return (await this.page.locator('[data-testid="login"]').count()) > 0;
  }

  async onDashboard() {
    return (await this.page.locator('[data-testid="dashboard"]').count()) > 0;
  }

  /** The area currently on screen, read from the real path. */
  currentState() {
    const url = this.page.url();
    const path = /^https?:\/\/[^/]+\/([^?#]*)/.exec(url);
    return path ? path[1] : '';
  }

  /** The view content only — the navbar carries its own .container. */
  viewText() {
    return this.page.locator(VIEW).innerText();
  }

  bodyText() {
    return this.page.locator('body').innerText();
  }

  enterButton() {
    return this.page.getByRole('button', { name: 'Enter Portal' });
  }

  /**
   * Signs in with the credentials the legacy screen used to post by itself.
   *
   * Q-8 turned a click into a form fill. The scenarios that only care about
   * the OUTCOME — arriving at the dashboard, the token being replaced — are
   * unchanged because this method absorbs the interaction, which is exactly
   * what a page object is for.
   */
  async enterPortal(email = 'demo@globaltravel.com', password = 'password') {
    await this.signIn(email, password);
    await this.page.waitForURL(/\/dashboard$/, { timeout: 15000 });
    await this.settle();
  }

  async signIn(email, password) {
    await this.page.fill('[data-testid="login-email"]', email);
    await this.page.fill('[data-testid="login-password"]', password);
    await this.enterButton().click();
  }

  /**
   * Submits and waits for WHICHEVER outcome arrives — the dashboard or a
   * refusal — so one Gherkin step can serve both. Waiting only for the
   * dashboard would make every refusal scenario fail by timeout rather than
   * by assertion, which hides what actually went wrong.
   */
  async signInAwaitingOutcome(email, password) {
    await this.signIn(email, password);
    await Promise.race([
      this.page.waitForURL(/\/dashboard$/, { timeout: 15000 }).catch(() => undefined),
      this.page
        .waitForSelector('[data-testid="login-error"]', { timeout: 15000 })
        .catch(() => undefined),
    ]);
    await this.settle();
  }

  loginError() {
    return this.page.locator('[data-testid="login-error"]');
  }

  loginInputs() {
    return this.page.locator(`${VIEW} input, ${VIEW} select, ${VIEW} textarea`).count();
  }

  async loginButtonNames() {
    return (await this.page.locator(`${VIEW} button`).allInnerTexts()).map((t) => t.trim());
  }

  navLinks() {
    return this.page.locator('nav.navbar a').allInnerTexts();
  }

  navText() {
    return this.page.locator('nav.navbar').innerText();
  }

  dashboardLinks() {
    return this.page.locator(`${VIEW} a`).allInnerTexts();
  }

  dashboardButtons() {
    return this.page.locator(`${VIEW} button`).allInnerTexts();
  }

  notifications() {
    return this.page.locator('.notification-area .alert').allInnerTexts();
  }

  // --- sign-out (net-new, Increment 6) --------------------------------------

  signOutButton() {
    return this.page.locator('[data-testid="sign-out"]');
  }

  async signOut() {
    await this.signOutButton().click();
    await this.settle();
  }

  async offersSignOut() {
    return (await this.signOutButton().count()) > 0;
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

  /**
   * Who the app thinks is signed in.
   *
   * Reads the auth store through the `identity()` seam
   * (`src/lib/test-seam.ts`). The `$rootScope` branch this method carried
   * through Increments 3-5 is gone with the injector it reached into.
   */
  async signedInUser() {
    return this.page.evaluate(() => {
      const seam = window.__flightSearch;
      if (!seam || typeof seam.identity !== 'function') return null;
      const u = seam.identity();
      return u ? JSON.parse(JSON.stringify(u)) : null;
    });
  }
}

module.exports = { AuthPage, BASE };
