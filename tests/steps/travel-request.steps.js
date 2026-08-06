/**
 * Steps for the travel requests green baseline.
 *
 * Every assertion here was written against observed behaviour of the running
 * AngularJS app. Where the app is wrong — the broken search, the un-dismissable
 * alert, the cancelled request that lingers under the Pending filter — the step
 * asserts the wrong behaviour on purpose, because that is the baseline.
 */
const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');

const SEPTEMBER = { 10: '2026-09-10T00:00:00', 17: '2026-09-17T00:00:00', 5: '2026-09-05T00:00:00' };

function splitList(value) {
  // Destinations contain commas ("London, UK"), so the list separator is ", "
  // between whole names — split on the comma that follows a two-letter-plus word
  // is unreliable. Scenarios therefore pass names that are matched by lookup.
  return value.split(/,\s*(?=[A-Z][a-z]*(?:,|$)|[A-Z])/);
}

/** Turns "London, UK, Tokyo, Japan" into ["London, UK", "Tokyo, Japan"]. */
function parseDestinations(value, known) {
  const wanted = [];
  let rest = value.trim();
  while (rest.length) {
    const match = known.find((k) => rest === k || rest.startsWith(`${k}, `));
    if (!match) {
      // Fall back to a naive split so a mismatch fails loudly with the raw text.
      return splitList(value).map((s) => s.trim());
    }
    wanted.push(match);
    rest = rest.slice(match.length).replace(/^,\s*/, '');
  }
  return wanted;
}

const KNOWN_DESTINATIONS = [
  'London, UK',
  'London, England',
  'Tokyo, Japan',
  'Berlin, Germany',
  'Sydney, Australia',
  'Oslo, Norway'
];

// ------------------------------------------------------------------- navigation

Given('I am on the travel requests page', async function () {
  await this.travelRequests.open();
});

// --------------------------------------------------------------------- the list

Then('the requests listed are {string}', async function (expected) {
  const wanted = parseDestinations(expected, KNOWN_DESTINATIONS);
  assert.deepStrictEqual(await this.travelRequests.listedDestinations(), wanted);
});

Then('the request for {string} reads:', async function (destination, table) {
  const cells = await this.travelRequests.rowCells(destination);
  for (const [column, value] of table.rows()) {
    assert.strictEqual(cells[column], value, `column "${column}" of the ${destination} row`);
  }
});

Then('the request summary cards read:', async function (table) {
  const cards = await this.travelRequests.summaryCards();
  const actual = Object.fromEntries(cards);
  for (const [label, value] of table.rows()) {
    assert.strictEqual(actual[label], value, `the "${label}" card`);
  }
});

Then('the request for {string} offers the actions {string}', async function (destination, expected) {
  const actions = await this.travelRequests.rowActions(destination);
  assert.deepStrictEqual(actions, expected.split(',').map((s) => s.trim()));
});

Then('the request for {string} is {string}', async function (destination, status) {
  assert.strictEqual(await this.travelRequests.statusOf(destination), status);
});

// ---------------------------------------------------------------------- filtering

When('I filter the requests by {string}', async function (label) {
  this.requests.length = 0;
  await this.travelRequests.filterBy(label);
});

Given('I have filtered the requests by {string}', async function (label) {
  await this.travelRequests.filterBy(label);
});

Then('no request table is shown', async function () {
  assert.strictEqual(await this.travelRequests.hasTable(), false);
});

Then('I am invited to create my first request', async function () {
  assert.strictEqual(await this.travelRequests.emptyStateHeading(), 'No travel requests found');
  const invite = this.page.getByRole('button', { name: /Create Your First Request/i });
  assert.strictEqual(await invite.count(), 1);
});

Then('the {string} request filter is highlighted', async function (label) {
  assert.strictEqual(await this.travelRequests.filterIsHighlighted(label), true);
});

Then('the {string} request filter is not highlighted', async function (label) {
  assert.strictEqual(await this.travelRequests.filterIsHighlighted(label), false);
});

Then('the requests were not fetched again', function () {
  const gets = this.requests.filter(
    (r) => r.method === 'GET' && /\/api\/travel-requests(\?|$)/.test(r.url)
  );
  assert.deepStrictEqual(gets, [], `expected no refetch, saw ${JSON.stringify(gets)}`);
});

// ---------------------------------------------------------------------- searching

When('I search the requests for {string}', async function (text) {
  await this.travelRequests.search(text);
});

Then('the browser reports that travelerName could not be read', function () {
  const hit = this.consoleErrors.find(
    (e) => /travelerName/.test(e) || /Cannot read properties of undefined \(reading 'toLowerCase'\)/.test(e)
  );
  assert.ok(
    hit,
    `expected a TypeError from applyFilters, saw ${JSON.stringify(this.consoleErrors)}`
  );
});

Then('the request search box still reads {string}', async function (expected) {
  assert.strictEqual(await this.travelRequests.searchText(), expected);
});

// ------------------------------------------------------------------ detail dialog

When('I open the details of the request for {string}', async function (destination) {
  await this.travelRequests.openDetails(destination);
});

Then('the request detail dialogue is headed {string}', async function (expected) {
  assert.strictEqual(await this.travelRequests.modalTitle(), expected);
});

Then('the request detail dialogue shows:', async function (table) {
  for (const [label, value] of table.rows()) {
    assert.strictEqual(await this.travelRequests.modalField(label), value, `the "${label}" line`);
  }
});

Then('the request cost breakdown reads:', async function (table) {
  const rows = await this.travelRequests.modalCostBreakdown();
  const actual = Object.fromEntries(rows.filter((r) => r.length === 2));
  for (const [label, value] of table.rows()) {
    assert.strictEqual(actual[label], value, `the "${label}" cost line`);
  }
});

Then('the request detail dialogue shows a blank traveller', async function () {
  assert.strictEqual(await this.travelRequests.modalField('Traveler'), '');
});

Then('the request detail dialogue says nothing about approvals', async function () {
  const text = await this.travelRequests.modalText();
  assert.ok(!/approv/i.test(text), 'expected no mention of approvals in the dialogue');
});

Then('the server holds an approval chain for that request', async function () {
  const approvals = await this.travelRequests.serverApprovals('tr-1');
  assert.ok(Array.isArray(approvals) && approvals.length > 0, 'expected the server to hold approvals');
  assert.ok(approvals[0].approver, 'expected the approval to name an approver');
});

Then('nothing on the travel requests page can approve or reject', async function () {
  // The four status FILTERS are labelled "Approved" and "Rejected"; they choose
  // what to list, they do not decide anything. Everything else is fair game.
  const labels = await this.travelRequests.actionButtonLabels();
  const offending = labels.filter((b) => /approve|reject/i.test(b));
  assert.deepStrictEqual(offending, [], `found approval controls: ${JSON.stringify(offending)}`);

  // Nor is there anywhere to send a decision.
  const endpoints = await this.travelRequests.serverAcceptsApprovalOf('tr-1');
  for (const { path, status } of endpoints) {
    assert.strictEqual(status, 404, `expected no endpoint at ${path}, got HTTP ${status}`);
  }
});

// ---------------------------------------------------------------------- the form

Then('the travel request form is not shown', async function () {
  assert.strictEqual(await this.travelRequests.formIsShown(), false);
});

Then('the travel request form is shown', async function () {
  assert.strictEqual(await this.travelRequests.formIsShown(), true);
});

When('I start a new travel request', async function () {
  await this.travelRequests.startNewRequest();
});

Given('I have started a new travel request', async function () {
  await this.travelRequests.startNewRequest();
});

Then('the new request button now reads {string}', async function (expected) {
  // The button label is uppercased in CSS, so compare case-insensitively.
  const label = await this.travelRequests.newRequestButtonLabel();
  assert.strictEqual(label.toLowerCase(), expected.toLowerCase());
});

Given('I have entered {string} as the request destination', async function (value) {
  await this.travelRequests.setDestination(value);
});

When('I abandon the travel request form', async function () {
  await this.travelRequests.toggleForm();
});

Then('the request destination is empty', async function () {
  assert.strictEqual(await this.travelRequests.destinationInput.inputValue(), '');
});

Then('the request destination is {string}', async function (expected) {
  assert.strictEqual(await this.travelRequests.destinationInput.inputValue(), expected);
});

When('I fill the travel request form as far as {string} and submit it', async function (level) {
  const tr = this.travelRequests;
  const order = ['nothing', 'destination', 'backwards dates', 'dates', 'purpose', 'department'];
  const upTo = order.indexOf(level);
  assert.ok(upTo >= 0, `unknown form level "${level}"`);

  if (upTo >= 1) await tr.setDestination('Berlin, Germany');
  if (level === 'backwards dates') {
    await tr.setTripDates(SEPTEMBER[10], SEPTEMBER[5]);
  } else if (upTo >= 3) {
    await tr.setTripDates(SEPTEMBER[10], SEPTEMBER[17]);
  }
  if (upTo >= 4) await tr.selectPurpose();
  if (upTo >= 5) await tr.selectDepartment();

  await tr.submitForm();
});

Then('the travel request form complains {string}', async function (expected) {
  assert.strictEqual(await this.travelRequests.errorMessage(), expected);
  const alert = await this.travelRequests.errorAlert.innerText();
  assert.ok(alert.includes(expected), `expected the alert to show "${expected}", got "${alert}"`);
});

Then('the travel request form complains about nothing', async function () {
  assert.strictEqual(await this.travelRequests.errorMessage(), '');
});

Then('the request destination field is marked as being in error', async function () {
  const cls = await this.travelRequests.destinationFieldClass();
  assert.ok(cls.includes('has-error'), `expected has-error, got "${cls}"`);
});

When('I dismiss the travel request complaint', async function () {
  await this.travelRequests.dismissError();
});

Then('the travel request form still complains {string}', async function (expected) {
  assert.strictEqual(await this.travelRequests.errorAlert.isVisible(), true);
  assert.strictEqual(await this.travelRequests.errorMessage(), expected);
  // The click did land — it just landed on the ng-if child scope.
  const onChild = await this.travelRequests.readAlertScope((sc) => sc.errorMessage);
  assert.strictEqual(onChild, '', 'expected the child scope to have been cleared instead');
});

When('I estimate {int} for flights and {int} for hotels', async function (flights, hotels) {
  await this.travelRequests.setCosts(flights, hotels);
});

Then('the travel request total estimate reads {string}', async function (expected) {
  assert.strictEqual(await this.travelRequests.totalEstimateText(), expected);
});

When(
  'I choose {int} September 2026 to {int} September 2026 for the trip',
  async function (depart, ret) {
    await this.travelRequests.setTripDates(SEPTEMBER[depart], SEPTEMBER[ret]);
  }
);

Then('the travel request duration badge reads {string}', async function (expected) {
  assert.strictEqual(await this.travelRequests.durationBadge(), expected);
});

Then('no travel request duration badge is shown', async function () {
  assert.strictEqual(await this.travelRequests.durationBadge(), null);
});

Then('the controller has worked the duration out as {int} days', async function (expected) {
  assert.strictEqual(await this.travelRequests.readScope((sc) => sc.newRequest.tripDuration), expected);
});

// ----------------------------------------------------------------------- creating

async function fillComplete(tr, destination, flights) {
  await tr.setDestination(destination);
  await tr.setTripDates(SEPTEMBER[10], SEPTEMBER[17]);
  await tr.selectPurpose();
  await tr.selectDepartment();
  await tr.setCosts(flights, 600);
}

When('I fill in a complete travel request for {string}', async function (destination) {
  await fillComplete(this.travelRequests, destination, 900);
});

When(
  'I fill in a complete travel request for {string} estimating {int} for flights',
  async function (destination, flights) {
    await fillComplete(this.travelRequests, destination, flights);
  }
);

When('I submit the travel request', async function () {
  await this.travelRequests.submitForm();
});

Then('the stored request for {string} names the traveller {string}', async function (destination, name) {
  const stored = await this.travelRequests.serverRequestFor(destination);
  assert.ok(stored, `no stored request for ${destination}`);
  assert.strictEqual(stored.travelerName, name);
});

Then('the stored request for {string} lists one nameless traveller', async function (destination) {
  const stored = await this.travelRequests.serverRequestFor(destination);
  assert.ok(stored, `no stored request for ${destination}`);
  assert.deepStrictEqual(stored.travelers, [{ name: '', email: '' }]);
});

Then('the stored request for {string} is estimated at {int}', async function (destination, flights) {
  const stored = await this.travelRequests.serverRequestFor(destination);
  assert.ok(stored, `no stored request for ${destination}`);
  assert.strictEqual(stored.estimatedCosts.flights, flights);
});

// ------------------------------------------------------------------------ editing

When('I edit the request for {string}', async function (destination) {
  await this.travelRequests.editRequest(destination);
});

Then('the travel request submit button offers to update rather than submit', async function () {
  const label = await this.travelRequests.submitButtonLabel();
  assert.ok(/update/i.test(label), `expected an update label, got "${label}"`);
});

When('I change the request destination to {string}', async function (value) {
  await this.travelRequests.setDestination(value);
});

// --------------------------------------------------------------------- cancelling

When('I cancel the request for {string}', async function (destination) {
  this.requests.length = 0;
  this.dialogs = await this.travelRequests.cancelRequest(destination, { accept: true });
});

When('I decline to cancel the request for {string}', async function (destination) {
  this.requests.length = 0;
  this.dialogs = await this.travelRequests.cancelRequest(destination, { accept: false });
});

Then('the server holds the request for {string} as {string}', async function (destination, status) {
  const stored = await this.travelRequests.serverRequestFor(destination);
  assert.ok(stored, `no stored request for ${destination}`);
  assert.strictEqual(stored.status, status);
});

Then('no travel request was written to the server', function () {
  const writes = this.requests.filter(
    (r) => ['PUT', 'POST', 'DELETE'].includes(r.method) && /travel-requests/.test(r.url)
  );
  assert.deepStrictEqual(writes, [], `expected no writes, saw ${JSON.stringify(writes)}`);
});

// -------------------------------------------------------------- SEAM-1: no policy

Then('the travel policy was never requested', function () {
  const asked = this.requests.filter((r) => /travel-policy/.test(r.url));
  assert.deepStrictEqual(asked, [], `expected no policy request, saw ${JSON.stringify(asked)}`);
});

Then('the server publishes a travel policy', async function () {
  const policy = await this.travelRequests.serverPolicy();
  assert.ok(policy && typeof policy === 'object', 'expected a policy document');
  assert.ok(Object.keys(policy).length > 0, 'expected the policy to carry limits');
});

Then('nothing on the travel requests page mentions a policy or a limit', async function () {
  const text = await this.travelRequests.pageText();
  assert.ok(!/\bpolicy\b/i.test(text), 'the page mentions a policy');
  assert.ok(!/\blimit\b/i.test(text), 'the page mentions a limit');
});

Then('the server would have said the maximum flight cost is {int}', async function (expected) {
  const policy = await this.travelRequests.serverPolicy();
  assert.strictEqual(policy.maxFlightCost, expected);
});
