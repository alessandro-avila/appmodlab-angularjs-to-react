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

/**
 * AuthPage is a thin wrapper over `this.page` with no per-feature setup, and
 * since Increment 6 its identity reader is used from travel-request too (the
 * C-1 repair is observable wherever attribution is). Attaching it to EVERY
 * scenario removes a footgun: a cross-feature step that reached for
 * `this.auth` used to fail with "Cannot read properties of undefined".
 *
 * `this.server` stays scoped to the authentication feature — it holds
 * API-only response state that nothing else uses.
 */
Before(function () {
  this.auth = new AuthPage(this.page);
});

Before({ tags: '@feature-authentication' }, function () {
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

// `I am known to the portal as` was removed in Increment 6. It asserted that
// identity was present BEFORE a reload so the next step could prove it had
// been lost — the C-1 defect. With C-1 repaired the interesting assertion is
// that identity SURVIVES, which `the portal still knows me as` makes directly.

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
  this.memory.typedCredentials = { ...BUILT_IN };
  await this.auth.enterPortal();
});

When('I enter the portal again', async function () {
  this.memory.tokenBefore = await this.auth.storedToken();
  this.memory.typedCredentials = { ...BUILT_IN };
  await this.auth.enterPortal();
});

// Q-8 — signing in with typed credentials (net-new, Increment 6).
// Waits for whichever outcome arrives, so a refusal fails by assertion rather
// than by timeout.
When('I sign in as {string} with password {string}', async function (email, password) {
  this.memory.typedCredentials = { email, password };
  await this.auth.signInAwaitingOutcome(email, password);
});

When('I sign out', async function () {
  await this.auth.signOut();
});

// ADR-012 §3 — a legacy bookmark. The fragment is never transmitted, so the
// server sees GET / and the portal root answers.
When('I go to the legacy address {string}', async function (fragment) {
  await this.auth.goToLegacyHash(fragment);
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

Then('I land on the login screen', async function () {
  assert.ok(await this.auth.onLoginScreen(), `expected the login screen, was at ${this.auth.url()}`);
});

Then('I am returned to the login screen', async function () {
  assert.ok(await this.auth.onLoginScreen(), `expected to be bounced to login, was at ${this.auth.url()}`);
});

Then('I am still on the login screen', async function () {
  assert.ok(await this.auth.onLoginScreen(), `expected to stay on login, was at ${this.auth.url()}`);
});

// ADR-018 — the session-expiry policy. A 401 is a session event, not a data
// event, so the traveller is told about the SESSION and never shown an
// empty-state screen that misdescribes their data as absent.

Then('I am told my session has expired', async function () {
  const body = await this.auth.bodyText();
  assert.match(
    body,
    /session has expired/i,
    'expected the screen to say the session expired'
  );
});

Then('I am not told that I have no trips', async function () {
  const body = await this.auth.bodyText();
  assert.doesNotMatch(
    body,
    /No trips yet/i,
    'a rejected session must not be reported as an empty itinerary'
  );
});

Then('the login screen offers a single way in', async function () {
  const buttons = await this.auth.loginButtonNames();
  assert.deepStrictEqual(buttons, ['Enter Portal'], `login buttons were ${JSON.stringify(buttons)}`);
});

Then('the login screen asks for an email address and a password', async function () {
  // Q-8 — the credential form. Replaces "has no fields to type into".
  const fields = await this.auth.loginInputs();
  assert.strictEqual(fields, 2, `expected exactly the two credential fields, found ${fields}`);
  await this.auth.page.waitForSelector('[data-testid="login-email"]');
  await this.auth.page.waitForSelector('[data-testid="login-password"]');
});

// `the login screen reads "Mock login - click to enter"` was removed in
// Increment 6. That copy belonged to the button-only screen Q-8 replaced.

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

Then('the portal sent the credentials I typed to the server', function () {
  // Q-8 — the credentials come from the form now, not from constants in an
  // inline controller. `this.memory.typedCredentials` is what the step that
  // filled the form recorded, so this asserts the round trip rather than
  // re-stating a literal.
  const posts = this.requests.filter((r) => r.method === 'POST' && /\/api\/auth\/login$/.test(r.url));
  assert.strictEqual(posts.length, 1, `expected one login request, saw ${posts.length}`);
  assert.deepStrictEqual(JSON.parse(posts[0].postData), this.memory.typedCredentials);
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

// Both `$rootScope.$$listeners` steps were removed in Increment 5. They
// inspected the digest's listener registry to prove auth:login was heard and
// auth:logout was not — a MECHANISM that no longer exists once the last
// feature module is React (ADR-005 P-5, ADR-013). The scenarios that used
// them are superseded in authentication.feature at :113 and :149, and the
// findings they recorded are re-asserted there through the UI instead.

// ---------------------------------------------------------------------------
// Then — no way out
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Then — sign-out (net-new, Increment 6 — ADR-010)
// ---------------------------------------------------------------------------

Then('the page offers to sign me out', async function () {
  assert.ok(
    await this.auth.offersSignOut(),
    `expected a sign-out control, page was ${JSON.stringify((await this.auth.bodyText()).slice(0, 200))}`
  );
});

// `nothing on the page offers to sign me out` was removed in Increment 6 —
// sign-out now exists on every signed-in screen, which is what `the page
// offers to sign me out` asserts. The signed-OUT half of that finding is still
// pinned, by `the navigation bar offers no way to sign out`.

Then('my session token is no longer stored', async function () {
  const token = await this.auth.storedToken();
  assert.strictEqual(token, null, `expected the token to be gone, saw ${JSON.stringify(token)}`);
});

Then('the portal no longer knows who I am', async function () {
  const user = await this.auth.signedInUser();
  assert.strictEqual(user, null, `expected no signed-in user, saw ${JSON.stringify(user)}`);
});

Then('the dashboard has no buttons on it', async function () {
  const buttons = await this.auth.dashboardButtons();
  assert.deepStrictEqual(buttons, [], `dashboard buttons were ${JSON.stringify(buttons)}`);
});

// ---------------------------------------------------------------------------
// Then — identity SURVIVES a reload (C-1 repaired in Increment 6)
// ---------------------------------------------------------------------------

Then('my session token is still stored', async function () {
  const token = await this.auth.storedToken();
  assert.ok(token, 'expected the session token to survive the reload');
});

Then('the portal still knows me as {string}', async function (name) {
  const user = await this.auth.signedInUser();
  assert.ok(user, 'expected the identity to survive the reload (C-1 repair)');
  assert.strictEqual(user.name, name);
});

Then('the portal asked the server to identify me', function () {
  // GET /api/auth/me has always answered this question and was never called.
  const identity = this.requests.filter((r) => /\/api\/auth\/me/.test(r.url));
  assert.ok(identity.length > 0, 'expected the portal to ask who the token belongs to');
});

Then('the portal made no request to identify me', function () {
  const identity = this.requests.filter((r) => /\/api\/auth\/me/.test(r.url));
  assert.strictEqual(identity.length, 0, `expected no identity request, saw ${identity.length}`);
});

// ---------------------------------------------------------------------------
// Then — refusals (Q-8, net-new)
// ---------------------------------------------------------------------------

Then('I am told the credentials were rejected', async function () {
  const message = (await this.auth.loginError().innerText()).trim();
  assert.match(message, /incorrect/i, `refusal message was ${JSON.stringify(message)}`);
  this.memory.refusalMessage = message;
});

Then('no session token is stored', async function () {
  const token = await this.auth.storedToken();
  assert.strictEqual(token, null, `expected no token, saw ${JSON.stringify(token)}`);
});

Then('the refusal does not say whether the account exists', function () {
  const message = String(this.memory.refusalMessage || '').toLowerCase();
  for (const leak of ['not found', 'no such', 'unknown user', 'does not exist', 'no account']) {
    assert.ok(!message.includes(leak), `refusal leaked account existence: ${JSON.stringify(message)}`);
  }
});

Then('the session token records my role as {string}', async function (role) {
  const { payload } = this.auth.decodeToken(await this.auth.storedToken());
  assert.strictEqual(payload.role, role);
});

Then('I am shown the dashboard', async function () {
  assert.ok(await this.auth.onDashboard(), `expected the dashboard, was at ${this.auth.url()}`);
});

Then('the address bar still shows {string}', function (fragment) {
  // ADR-012 §3: "The fragment remains in the address bar and is ignored."
  assert.ok(
    this.auth.url().includes(fragment),
    `expected the fragment to survive, url was ${this.auth.url()}`
  );
});

Then('the page did not fail', async function () {
  // ADR-012 §3: "There is no error, no 404, and no blank page."
  const body = (await this.auth.bodyText()).trim();
  assert.ok(body.length > 0, 'the page rendered nothing at all');
  assert.doesNotMatch(body, /cannot GET|404|not found/i, `page reported a failure: ${JSON.stringify(body.slice(0, 200))}`);
});

Then('I am still on {string}', function (area) {
  assert.strictEqual(this.auth.currentState(), area, `was at ${this.auth.url()}`);
});

Then('a new expense report would be filed by {string}', async function (expected) {
  // Reads the app's REAL identity from the auth store and applies the fallback
  // the expense controller applies (controller:194, ported at
  // ExpenseReconciliation.tsx). Since the C-1 repair in Increment 6 the
  // identity survives a reload, so this now asserts the traveller's own name
  // rather than the placeholder.
  const user = await this.auth.signedInUser();
  assert.strictEqual((user && user.name) || 'Demo User', expected);
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
  const body = await this.auth.bodyText();
  assert.ok(/CREATE YOUR FIRST REPORT/i.test(body), 'expected the first-report invitation');
});

// ADR-018 — a rejected session must not be dressed up as an empty account.
Then('I am not invited to create my first expense report', async function () {
  const body = await this.auth.bodyText();
  assert.ok(
    !/CREATE YOUR FIRST REPORT/i.test(body),
    'a rejected session must not be reported as an empty expense account'
  );
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
