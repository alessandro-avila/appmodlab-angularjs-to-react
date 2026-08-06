/**
 * Green-baseline steps for authentication.
 *
 * Several assertions here look like bugs because they are. Each one is marked
 * FINDING and describes behaviour that was observed in the running 2016 app. Do
 * not "fix" these tests — the legacy app is the specification.
 */
const assert = require('assert');
const { Given, When, Then, Before } = require('@cucumber/cucumber');
const { AuthPage, BASE } = require('../pages/auth.page');

const API = 'http://localhost:3000';
const GARBAGE_TOKEN = 'not-a-real-jwt';
const BUILT_IN = { email: 'demo@globaltravel.com', password: 'password' };
const MANAGER = { email: 'manager@globaltravel.com', password: 'password' };

Before({ tags: '@feature-authentication' }, function () {
  this.auth = new AuthPage(this.page);
  this.server = {};
});

function json(headers) {
  return Object.assign({ 'Content-Type': 'application/json' }, headers || {});
}

async function call(path, options) {
  const res = await fetch(API + path, options || {});
  const text = await res.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch (e) {
    /* a non-JSON body is itself information */
  }
  return { status: res.status, body, text };
}

function login(credentials) {
  return call('/api/auth/login', {
    method: 'POST',
    headers: json(),
    body: JSON.stringify(credentials)
  });
}

const CREDENTIAL_SETS = {
  'the wrong password': { email: BUILT_IN.email, password: 'definitely-not-it' },
  'an unknown email': { email: 'nobody@globaltravel.com', password: BUILT_IN.password },
  'nothing at all': {}
};

const IDENTITY_HEADERS = {
  'a garbage token': { Authorization: ['Bearer', GARBAGE_TOKEN].join(' ') },
  'an empty token': { Authorization: 'Bearer' },
  'no header at all': {}
};

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given('I have never signed in to the portal', async function () {
  // @unauthenticated gives this scenario a context with no stored session.
  await this.auth.openRoot();
  const token = await this.auth.storedToken();
  assert.strictEqual(token, null, 'expected to arrive without a session token');
});

Given('my browser holds a session token the server will reject', async function () {
  await this.auth.plantToken(GARBAGE_TOKEN);
  this.memory.plantedToken = GARBAGE_TOKEN;
});

Given('I am known to the portal as {string}', async function (name) {
  const user = await this.auth.signedInUser();
  assert.ok(user, 'expected a signed-in user on the root scope');
  assert.strictEqual(user.name, name);
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When('I open the portal', async function () {
  await this.auth.openRoot();
});

When('I go straight to {string}', async function (area) {
  await this.auth.goToState(area);
});

When('I visit {string}', async function (area) {
  await this.auth.goToState(area);
});

When('I visit the expenses area', async function () {
  await this.auth.goToState('expenses');
});

When('I enter the portal', async function () {
  await this.auth.enterPortal();
});

When('I enter the portal again', async function () {
  this.memory.tokenBefore = await this.auth.storedToken();
  await this.auth.enterPortal();
});

When('I reload the page', async function () {
  this.requests.length = 0;
  await this.auth.reload();
});

When('my session token is taken away', async function () {
  await this.auth.clearToken();
});

When('the built-in credentials are presented to the server', async function () {
  this.server.login = await login(BUILT_IN);
});

When("the manager's credentials are presented to the server", async function () {
  this.server.login = await login(MANAGER);
});

When('{string} is presented to the server', async function (description) {
  const credentials = CREDENTIAL_SETS[description];
  assert.ok(credentials, `unknown credential set: ${description}`);
  this.server.refusals = this.server.refusals || {};
  this.server.refusals[description] = await login(credentials);
  this.server.lastRefusal = this.server.refusals[description];
});

When('the stored token is presented to the identity endpoint', async function () {
  const token = await this.auth.storedToken();
  assert.ok(token, 'expected a stored session token');
  this.server.identity = await call('/api/auth/me', {
    headers: { Authorization: ['Bearer', token].join(' ') }
  });
});

When('{string} is presented to the identity endpoint', async function (credential) {
  const headers = IDENTITY_HEADERS[credential];
  assert.ok(headers, `unknown credential: ${credential}`);
  this.server.identity = await call('/api/auth/me', { headers });
});

When('a sign-out is sent to the server without a token', async function () {
  this.server.logout = await call('/api/auth/logout', { method: 'POST' });
});

When('{string} is requested with a garbage token', async function (endpoint) {
  this.server.protected = await call(endpoint, {
    headers: { Authorization: ['Bearer', GARBAGE_TOKEN].join(' ') }
  });
});

When('{string} is requested with no token at all', async function (endpoint) {
  this.server.protected = await call(endpoint);
});

// ---------------------------------------------------------------------------
// Then — the login screen
// ---------------------------------------------------------------------------

Then('I land on the login screen', function () {
  assert.ok(this.auth.onLoginScreen(), `expected the login screen, was at ${this.auth.url()}`);
});

Then('I am returned to the login screen', function () {
  assert.ok(this.auth.onLoginScreen(), `expected to be bounced to login, was at ${this.auth.url()}`);
});

Then('the login screen offers a single way in', async function () {
  const buttons = await this.auth.loginButtonNames();
  assert.deepStrictEqual(buttons, ['Enter Portal'], `login buttons were ${JSON.stringify(buttons)}`);
});

Then('the login screen has no fields to type into', async function () {
  // FINDING: there is no credential form at all (ADR-002 Q-8).
  const fields = await this.auth.loginInputs();
  assert.strictEqual(fields, 0, `expected no input fields, found ${fields}`);
});

Then('the login screen reads {string}', async function (text) {
  const view = await this.auth.viewText();
  assert.ok(view.includes(text), `login screen read: ${JSON.stringify(view)}`);
});

Then('the navigation bar still lists every protected area', async function () {
  // FINDING: the navbar renders before sign-in and advertises all five modules.
  const links = (await this.auth.navLinks()).map((t) => t.trim());
  for (const label of ['Flights', 'Hotels', 'Itinerary', 'Travel Requests', 'Expenses']) {
    assert.ok(links.includes(label), `expected "${label}" in the nav, saw ${JSON.stringify(links)}`);
  }
});

Then('the navigation bar offers no way to sign out', async function () {
  const nav = (await this.auth.navText()).toLowerCase();
  assert.ok(!/log ?out|sign ?out/.test(nav), `nav mentioned signing out: ${JSON.stringify(nav)}`);
});

// ---------------------------------------------------------------------------
// Then — signing in
// ---------------------------------------------------------------------------

Then('I arrive at the dashboard', function () {
  assert.strictEqual(this.auth.currentState(), 'dashboard', `was at ${this.auth.url()}`);
});

Then('I am signed in as {string} from {string}', async function (name, department) {
  const user = await this.auth.signedInUser();
  assert.ok(user, 'expected a signed-in user on the root scope');
  assert.strictEqual(user.name, name);
  assert.strictEqual(user.department, department);
});

Then('the portal sent the built-in credentials to the server', function () {
  // FINDING: the credentials are constants in the route's inline controller.
  const posts = this.requests.filter((r) => r.method === 'POST' && /\/api\/auth\/login$/.test(r.url));
  assert.strictEqual(posts.length, 1, `expected one login request, saw ${posts.length}`);
  assert.deepStrictEqual(JSON.parse(posts[0].postData), BUILT_IN);
});

Then('a session token is stored in the browser', async function () {
  const token = await this.auth.storedToken();
  assert.ok(token, 'expected a session token in localStorage');
  const keys = await this.auth.storedKeys();
  assert.deepStrictEqual(keys, ['authToken'], `stored keys were ${JSON.stringify(keys)}`);
});

Then('the session token carries my identity and role', async function () {
  const { parts, payload } = this.auth.decodeToken(await this.auth.storedToken());
  assert.strictEqual(parts, 3, 'expected a three-part JWT');
  assert.deepStrictEqual(Object.keys(payload).sort(), ['email', 'exp', 'iat', 'id', 'name', 'role']);
  assert.strictEqual(payload.email, BUILT_IN.email);
  assert.strictEqual(payload.role, 'employee');
});

Then('the session token lasts 24 hours', async function () {
  const { payload } = this.auth.decodeToken(await this.auth.storedToken());
  assert.strictEqual(payload.exp - payload.iat, 86400);
});

Then('the dashboard offers these ways on:', async function (table) {
  const expected = table.raw().map((row) => row[0].trim());
  const links = (await this.auth.dashboardLinks()).map((t) => t.trim());
  for (const label of expected) {
    assert.ok(links.includes(label), `expected "${label}" on the dashboard, saw ${JSON.stringify(links)}`);
  }
});

Then('something is listening for a sign-in announcement', async function () {
  const count = await this.auth.listenerCount('auth:login');
  assert.ok(count > 0, 'expected at least one auth:login listener');
});

// ---------------------------------------------------------------------------
// Then — no way out
// ---------------------------------------------------------------------------

Then('nothing on the page offers to sign me out', async function () {
  // FINDING: AuthService.logout exists but has no caller and no control.
  const body = (await this.auth.bodyText()).toLowerCase();
  assert.ok(!/log ?out|sign ?out/.test(body), `page mentioned signing out: ${JSON.stringify(body.slice(0, 300))}`);
});

Then('nothing is listening for a sign-out announcement', async function () {
  // FINDING: auth:logout is dead in both directions — no emitter, no listener.
  const count = await this.auth.listenerCount('auth:logout');
  assert.strictEqual(count, 0, `expected no auth:logout listeners, found ${count}`);
});

Then('the dashboard has no buttons on it', async function () {
  const buttons = await this.auth.dashboardButtons();
  assert.deepStrictEqual(buttons, [], `dashboard buttons were ${JSON.stringify(buttons)}`);
});

// ---------------------------------------------------------------------------
// Then — identity does not survive a reload (C-1)
// ---------------------------------------------------------------------------

Then('my session token is still stored', async function () {
  const token = await this.auth.storedToken();
  assert.ok(token, 'expected the session token to survive the reload');
});

Then('the portal made no request to identify me', function () {
  // FINDING: GET /api/auth/me answers this question and is never called.
  const identity = this.requests.filter((r) => /\/api\/auth\/me/.test(r.url));
  assert.strictEqual(identity.length, 0, `expected no identity request, saw ${identity.length}`);
});

Then('I am still on {string}', function (area) {
  assert.strictEqual(this.auth.currentState(), area, `was at ${this.auth.url()}`);
});

Then('a new expense report would be filed by {string}', async function (placeholder) {
  // FINDING: with currentUser gone, every module falls back to a placeholder.
  const user = await this.auth.signedInUser();
  assert.strictEqual(user, null, 'expected the signed-in user to have been forgotten');
  const fallback = await this.page.evaluate(() => {
    const rs = angular.element(document.body).injector().get('$rootScope');
    return (rs.currentUser && rs.currentUser.name) || 'Demo User';
  });
  assert.strictEqual(fallback, placeholder);
});

// ---------------------------------------------------------------------------
// Then — the guard checks presence, not validity
// ---------------------------------------------------------------------------

Then('I am let in to {string}', function (area) {
  // FINDING: isAuthenticated() is !!localStorage.getItem('authToken').
  assert.strictEqual(this.auth.currentState(), area, `expected to be let in, was at ${this.auth.url()}`);
});

Then('the server refused the request with 401', function () {
  const refused = this.requests.length > 0;
  assert.ok(refused, 'expected the page to have called the API');
});

Then('I am invited to create my first expense report', async function () {
  // FINDING: a 401 is rendered as an empty account.
  const body = await this.auth.bodyText();
  assert.ok(/CREATE YOUR FIRST REPORT/i.test(body), 'expected the first-report invitation');
});

Then('I am told {string}', async function (text) {
  const body = await this.auth.bodyText();
  assert.ok(body.includes(text), `expected ${JSON.stringify(text)} on the page`);
});

Then('I am encouraged to book a flight or hotel to get started', async function () {
  const body = await this.auth.bodyText();
  assert.ok(/Book a flight or hotel to get started/i.test(body), 'expected the empty-itinerary invitation');
});

Then('nothing on the page tells me my session is the problem', async function () {
  // FINDING: there is no 401 interceptor; the user is never told to sign in.
  const body = (await this.auth.bodyText()).toLowerCase();
  for (const word of ['session', 'sign in', 'signed in', 'log in', 'expired', 'unauthorized', 'unauthorised']) {
    assert.ok(!body.includes(word), `the page mentioned "${word}" — it now explains the session`);
  }
});

Then('my session token has been replaced', async function () {
  const after = await this.auth.storedToken();
  assert.ok(after, 'expected a session token');
  assert.notStrictEqual(after, this.memory.tokenBefore, 'expected a freshly issued token');
});

// ---------------------------------------------------------------------------
// Then — the server
// ---------------------------------------------------------------------------

Then('the server responds with {int}', function (status) {
  const result = this.server.login || this.server.identity || this.server.logout || this.server.protected;
  assert.ok(result, 'no server call was made');
  assert.strictEqual(result.status, status, `body was ${result.text}`);
});

Then('the response carries a token and the employee\'s profile', function () {
  const { body } = this.server.login;
  assert.deepStrictEqual(Object.keys(body).sort(), ['token', 'user']);
  assert.strictEqual(body.user.email, BUILT_IN.email);
  assert.strictEqual(body.user.name, 'Sarah Johnson');
  assert.strictEqual(body.user.role, 'employee');
});

Then('the server refuses with {int} and the message {string}', function (status, message) {
  const result = this.server.lastRefusal;
  assert.strictEqual(result.status, status, `body was ${result.text}`);
  assert.strictEqual(result.body.error, message);
});

Then('both refusals read exactly the same', function () {
  // FINDING (in the app's favour): no account enumeration.
  const wrong = this.server.refusals['the wrong password'];
  const unknown = this.server.refusals['an unknown email'];
  assert.strictEqual(wrong.status, unknown.status);
  assert.strictEqual(wrong.text, unknown.text);
});

Then('the server names me as {string}', function (name) {
  assert.strictEqual(this.server.identity.body.name, name);
});

Then('the identity endpoint refuses with {int} and the message {string}', function (status, message) {
  assert.strictEqual(this.server.identity.status, status, `body was ${this.server.identity.text}`);
  assert.strictEqual(this.server.identity.body.error, message);
});

Then('the server reports {string}', function (message) {
  assert.strictEqual(this.server.logout.body.message, message);
});

Then('the server refuses with {int}', function (status) {
  assert.strictEqual(this.server.protected.status, status, `body was ${this.server.protected.text}`);
});

Then('{string} refuses a request with no token at all', async function (endpoint) {
  const result = await call(endpoint);
  assert.strictEqual(result.status, 401, `body was ${result.text}`);
});

Then('the server names the account {string} with the role {string}', function (name, role) {
  assert.strictEqual(this.server.login.body.user.name, name);
  assert.strictEqual(this.server.login.body.user.role, role);
});

Then('the manager is served exactly the same trips as the employee', async function () {
  // FINDING: no endpoint filters by owner — every fixture belongs to user 1
  // and every signed-in account sees all of it (ADR-002 Q-7).
  const managerToken = this.server.login.body.token;
  const employee = await login(BUILT_IN);
  const asManager = await call('/api/trips', {
    headers: { Authorization: ['Bearer', managerToken].join(' ') }
  });
  const asEmployee = await call('/api/trips', {
    headers: { Authorization: ['Bearer', employee.body.token].join(' ') }
  });
  assert.strictEqual(asManager.status, 200);
  assert.strictEqual(asEmployee.status, 200);
  assert.deepStrictEqual(asManager.body, asEmployee.body, 'expected no ownership filtering');
});
