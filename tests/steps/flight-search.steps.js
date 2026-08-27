/**
 * Step definitions for the flight search green baseline.
 *
 * Every assertion here describes what the legacy application does today. When
 * one of these fails, the step is wrong — not the application.
 */
const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { BASE_URL } = require('../support/world');

/**
 * Fixed dates used whenever a scenario does not name one. "Today" in the lab
 * environment is 2026-08-05, and the departure picker has minDate 0, so these
 * are always selectable.
 */
const DEFAULT_DEPART = '08/10/2026';
const DEFAULT_RETURN = '08/20/2026';

const todayAsCalendarDate = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()}`;
};

const isSorted = (values, direction) =>
  values.every((value, i) =>
    i === 0 || (direction === 'asc' ? values[i - 1] <= value : values[i - 1] >= value));

/** Turn "9:30 AM" into minutes since midnight. */
const toMinutes = (label) => {
  const m = String(label).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = Number(m[1]) % 12;
  if (/PM/i.test(m[3])) hour += 12;
  return hour * 60 + Number(m[2]);
};

// ---------------------------------------------------------------- background

Given('I am signed in to the travel portal', async function () {
  // Increment 1: driven through the front door rather than the legacy server
  // directly, so the session this asserts is the one BOTH applications share.
  // localStorage is origin-scoped, so a token on :8080 would be invisible to
  // the React route (increment-plan §1.2).
  await this.page.goto(`${BASE_URL}/#!/dashboard`, { waitUntil: 'domcontentloaded' });
  const token = await this.page.evaluate(() => localStorage.getItem('authToken'));
  assert.ok(token, 'expected an auth token from the stored session');
});

Given('I am on the flight search page', async function () {
  await this.flights.open();
});

// ---------------------------------------------------------------- form setup

Given('I have entered {string} as the origin and {string} as the destination',
  async function (origin, destination) {
    await this.flights.setOrigin(origin);
    await this.flights.setDestination(destination);
  });

Given('the trip type is {string}', async function (tripType) {
  await this.flights.setTripType(tripType === 'oneway' ? 'one-way' : 'round-trip');
});

Given('the departure date is {string}', async function (date) {
  await this.flights.pickDate('departDate', date);
});

Given('the return date is {string}', async function (date) {
  await this.flights.pickDate('returnDate', date);
});

Given('I have chosen a departure date', async function () {
  await this.flights.pickDate('departDate', DEFAULT_DEPART);
});

Given('no departure date has been chosen yet', async function () {
  const departure = await this.flights.readScope((sc) => sc.searchParams.departDate);
  assert.strictEqual(departure, null, 'expected no departure date to have been chosen yet');
});

When('I change the departure date to {string}', async function (date) {
  await this.flights.pickDate('departDate', date);
});

When('I choose {string} as the departure date', async function (date) {
  await this.flights.pickDate('departDate', date);
});

When('I switch the trip type to {string}', async function (tripType) {
  await this.flights.setTripType(tripType === 'oneway' ? 'one-way' : 'round-trip');
});

// ------------------------------------------------------------------ searching

async function runSearch(world, origin, destination, departDate, returnDate) {
  await world.flights.setOrigin(origin);
  await world.flights.setDestination(destination);
  await world.flights.setTripType('round-trip');
  await world.flights.pickDate('departDate', departDate || DEFAULT_DEPART);
  await world.flights.pickDate('returnDate', returnDate || DEFAULT_RETURN);
  await world.flights.searchAndWait();
}

When('I search without entering an origin or a destination', async function () {
  await this.flights.search();
});

When('I search without choosing a departure date', async function () {
  await this.flights.search();
});

When('I search without choosing a return date', async function () {
  await this.flights.search();
});

When('I search {string} to {string} as a round trip', async function (origin, destination) {
  await runSearch(this, origin, destination);
});

Given('I have searched {string} to {string} as a round trip', async function (origin, destination) {
  await runSearch(this, origin, destination);
});

When('I search {string} to {string} as a round trip again', async function (origin, destination) {
  await runSearch(this, origin, destination);
});

When('I search {string} to {string} as a round trip departing {string}',
  async function (origin, destination, departDate) {
    // The return date must stay after the departure date or the app moves it.
    await runSearch(this, origin, destination, departDate, '12/20/2026');
  });

// ------------------------------------------------------------------ messages

Then('I see the message {string}', async function (message) {
  const shown = await this.flights.validationError();
  assert.strictEqual(shown, message);
});

Then('no flight results are shown', async function () {
  assert.strictEqual(await this.flights.resultCount(), 0);
});

Then('flight results are shown', async function () {
  const count = await this.flights.resultCount();
  assert.ok(count > 0, `expected at least one flight, got ${count}`);
});

Then('every result shows an airline, a departure time, a duration, a stop count and a price',
  async function () {
    const rows = await this.flights.resultRows();
    assert.ok(rows.length > 0, 'expected at least one flight');
    rows.forEach((row, i) => {
      assert.ok(row.airline, `row ${i} has no airline`);
      assert.ok(toMinutes(row.departureTime) !== null, `row ${i} has no departure time`);
      assert.ok(row.durationText, `row ${i} has no duration`);
      assert.ok(row.stops !== null, `row ${i} has no stop count`);
      assert.ok(row.price > 0, `row ${i} has no price`);
    });
  });

// ------------------------------------------------------------------- ordering

Then('the results are ordered by price from lowest to highest', async function () {
  const prices = (await this.flights.resultRows()).map((r) => r.price);
  assert.ok(isSorted(prices, 'asc'), `not ascending: ${prices.join(', ')}`);
});

Then('the results are ordered by price from highest to lowest', async function () {
  const prices = (await this.flights.resultRows()).map((r) => r.price);
  assert.ok(isSorted(prices, 'desc'), `not descending: ${prices.join(', ')}`);
});

Then('the results are ordered by duration from lowest to highest', async function () {
  const durations = (await this.flights.resultRows()).map((r) => r.durationMinutes);
  assert.ok(isSorted(durations, 'asc'), `not ascending: ${durations.join(', ')}`);
});

Given('the results are sorted by {string} from lowest to highest', async function (field) {
  const sortState = await this.flights.readScope(
    (sc) => ({ field: sc.sortField, reverse: sc.sortReverse })
  );
  assert.strictEqual(sortState.field, field);
  assert.strictEqual(sortState.reverse, false);
});

/** User vocabulary for the sort controls → the labels on the buttons. */
const SORT_BUTTONS = { price: 'Price', duration: 'Duration', departure: 'Departure' };

When('I sort by {string}', async function (label) {
  await this.flights.sortBy(SORT_BUTTONS[label.toLowerCase()] || label);
});

When('I sort by {string} again', async function (label) {
  await this.flights.sortBy(SORT_BUTTONS[label.toLowerCase()] || label);
});

// -------------------------------------------------------------- randomness

When('I note the flights I was offered', async function () {
  this.memory.noted = await this.flights.resultRows();
  assert.ok(this.memory.noted.length > 0, 'nothing to note');
});

Then('the flights I am offered are not the same as the ones I noted', async function () {
  const now = await this.flights.resultRows();
  const fingerprint = (rows) =>
    rows.map((r) => [r.airline, r.flightNumber, r.departureTime, r.price].join('|')).join('||');
  assert.notStrictEqual(
    fingerprint(now),
    fingerprint(this.memory.noted),
    'the backend returned an identical set of flights twice, which it is not expected to do'
  );
});

Then('the flight is dated today, not {string}', async function (searchedDate) {
  const details = await this.flights.selectedFlightDetails();
  assert.ok(details, 'expected the flight details panel to be open');
  // The panel formats the date as "Wed, Aug 5, 2026".
  const today = new Date().toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  assert.strictEqual(
    details.date, today,
    `expected the flight to carry today's date (${today}), got ${details.date}`
  );
  const searched = new Date(searchedDate).toLocaleDateString('en-US',
    { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  assert.notStrictEqual(details.date, searched);
});

// ----------------------------------------------------------------- the dates

Then('the return date becomes {string}', async function (expected) {
  const actual = await this.flights.dateFieldAsCalendarDate('returnDate');
  assert.strictEqual(actual, expected);
});

Then('the return date is still {string}', async function (expected) {
  const actual = await this.flights.dateFieldAsCalendarDate('returnDate');
  assert.strictEqual(actual, expected);
});

Then('the return date is empty', async function () {
  const raw = await this.flights.dateFieldText('returnDate');
  assert.strictEqual(raw, '');
});

// The step for the SUPERSEDED scenario "A chosen date is shown as a raw date
// string" is retired with it. The legacy field was a text input that AngularJS
// re-rendered from a bound Date, so it displayed Date.prototype.toString();
// explicit date parsing (ADR-009) replaces that with a calendar date.
Then('the departure date field reads the calendar date {string}',
  async function (expected) {
    const shown = await this.flights.dateFieldAsCalendarDate('departDate');
    assert.strictEqual(
      shown, expected,
      `expected the departure field to read ${expected}, got ${shown}`
    );
  });

// NET-NEW (ADR-009 item 5). The legacy screen could not do this at all: a typed
// value never fired the datepicker's onSelect, so the model stayed null while
// the field looked filled.
When('I type {string} into the departure date field', async function (date) {
  await this.flights.typeDate('departDate', date);
});

When('I search', async function () {
  await this.flights.searchAndWait();
});

// ----------------------------------------------------- the max price filter

Given('I have lowered the maximum price filter to its lowest setting', async function () {
  const bounds = await this.flights.maxPriceSliderBounds();
  await this.flights.setMaxPrice(bounds.min);
  this.memory.loweredMaxPrice = await this.flights.readScope((sc) => sc.filters.maxPrice);
});

Then('the maximum price filter will not go below the price of the cheapest flight',
  async function () {
    const bounds = await this.flights.maxPriceSliderBounds();
    const cheapest = await this.flights.readScope((sc) => sc.priceRange.min);
    assert.strictEqual(
      bounds.min, cheapest,
      'the slider floor should be the cheapest flight found'
    );
    await this.flights.setMaxPrice(0);
    const settled = Number(await this.flights.readScope((sc) => sc.filters.maxPrice));
    assert.strictEqual(
      settled, cheapest,
      `asking for 0 should settle at the cheapest flight (${cheapest}), got ${settled}`
    );
  });

Then('lowering it as far as it goes still leaves at least one flight listed', async function () {
  const listed = await this.flights.resultCount();
  assert.ok(listed >= 1, `expected at least one flight to survive the filter, got ${listed}`);
});

Then('the maximum price filter no longer holds the value I set', async function () {
  const current = await this.flights.readScope((sc) => sc.filters.maxPrice);
  assert.notStrictEqual(
    Number(current), Number(this.memory.loweredMaxPrice),
    'the filter kept the value the user chose, but a search is expected to reset it'
  );
});

Then('the maximum price filter is back at the top of the new price range', async function () {
  const state = await this.flights.readScope(
    (sc) => ({ maxPrice: Number(sc.filters.maxPrice), range: sc.priceRange })
  );
  const distance = state.range.max - state.maxPrice;
  assert.ok(
    distance >= 0 && distance < 50,
    `expected the filter to sit within one slider step of ${state.range.max}, got ${state.maxPrice}`
  );
});

Then('the maximum price filter is at most the price of the dearest flight', async function () {
  const state = await this.flights.readScope(
    (sc) => ({ maxPrice: Number(sc.filters.maxPrice), max: sc.priceRange.max })
  );
  assert.ok(
    state.maxPrice <= state.max,
    `filter ${state.maxPrice} should not exceed the dearest flight ${state.max}`
  );
});

Then('any flight priced above the maximum price filter is left out of the list', async function () {
  const maxPrice = Number(await this.flights.readScope((sc) => sc.filters.maxPrice));
  const prices = (await this.flights.resultRows()).map((r) => r.price);
  prices.forEach((price) => {
    assert.ok(price <= maxPrice, `${price} is listed but exceeds the filter ${maxPrice}`);
  });
});

Then('the notification counts every flight that was found', async function () {
  const found = await this.flights.readScope((sc) => sc.flights.length);
  const notification = await this.flights.latestNotification();
  assert.strictEqual(notification, `Found ${found} flights`);
});

Then('the list shows only the flights at or below the maximum price filter', async function () {
  const state = await this.flights.readScope((sc) => ({
    found: sc.flights.length,
    listed: sc.filteredFlights.length,
    maxPrice: Number(sc.filters.maxPrice),
    above: sc.flights.filter((f) => f.price > Number(sc.filters.maxPrice)).length
  }));
  const heading = await this.flights.resultCountFromHeading();
  assert.strictEqual(heading, state.listed, 'the heading should count the listed flights');
  assert.strictEqual(
    state.listed, state.found - state.above,
    'the list should hold every flight at or below the filter and no other'
  );
});

// -------------------------------------------------------------- the filters

When('I filter by one of the airlines offered', async function () {
  const airlines = await this.flights.readScope((sc) => sc.airlines);
  this.memory.airline = airlines[0];
  await this.flights.filterByAirline(this.memory.airline);
});

Then('every flight listed is operated by that airline', async function () {
  const rows = await this.flights.resultRows();
  assert.ok(rows.length > 0, 'expected the chosen airline to still have flights listed');
  rows.forEach((row) => assert.strictEqual(row.airline, this.memory.airline));
});

When('I filter by {string}', async function (label) {
  const byLabel = { 'Non-stop': '0', '1 Stop or fewer': '1', '2 Stops or fewer': '2' };
  await this.flights.filterByStops(byLabel[label]);
});

Then('no flight listed has a stop', async function () {
  const rows = await this.flights.resultRows();
  rows.forEach((row) => assert.strictEqual(row.stops, 0, `${row.airline} has ${row.stops} stop(s)`));
});

When('I filter by the {string} departure time', async function (band) {
  await this.flights.filterByDepartureTime(band);
});

Then('every flight listed departs between {string} and {string}',
  async function (from, to) {
    const toBandMinutes = (hhmm) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };
    const start = toBandMinutes(from);
    const end = toBandMinutes(to);
    const wraps = end < start;
    const rows = await this.flights.resultRows();
    rows.forEach((row) => {
      const at = toMinutes(row.departureTime);
      const inBand = wraps ? (at >= start || at <= end) : (at >= start && at <= end);
      assert.ok(inBand, `${row.departureTime} is listed but falls outside ${from}-${to}`);
    });
  });

// -------------------------------------------------------- selecting, booking

When('I select the first flight offered', async function () {
  this.memory.selected = (await this.flights.resultRows())[0];
  await this.flights.selectResult(0);
});

Given('I have selected the first flight offered', async function () {
  this.memory.selected = (await this.flights.resultRows())[0];
  await this.flights.selectResult(0);
});

Then('the details of that flight are shown', async function () {
  const details = await this.flights.selectedFlightDetails();
  assert.ok(details, 'expected a details panel');
  assert.ok(
    details.text.includes(this.memory.selected.airline),
    `details should be for ${this.memory.selected.airline}`
  );
  assert.ok(details.date, 'details should show the flight date');
  assert.ok(details.duration, 'details should show the duration');
});

// The three steps for the SUPERSEDED scenario "The flight I selected covers the
// date calendar" are retired with it. They hit-tested the jQuery UI calendar —
// a div rendered INSIDE the document at z-index 1 — against the selected result
// row that painted over it. A native date input renders its calendar outside the
// document, so there is no in-page popup left to cover and nothing to hit-test.

Then('no result carries a flight number', async function () {
  const rows = await this.flights.resultRows();
  assert.ok(rows.length > 0, 'expected flights to be listed');
  rows.forEach((row) => {
    assert.strictEqual(row.flightNumber, '', `expected an empty flight number, got "${row.flightNumber}"`);
  });
});

Then('the details name the airline followed by an empty flight number', async function () {
  const details = await this.flights.selectedFlightDetails();
  assert.strictEqual(
    details.heading, `${this.memory.selected.airline} -`,
    'the details heading should read "<airline> -" with nothing after the dash'
  );
});

When('I book the selected flight', async function () {
  await this.flights.recordBroadcast('itinerary:refresh');
  await this.flights.book();
  // Increment 1: this wait used to reach into `angular.element(...).scope()`
  // INLINE, here in the step definition, rather than through the page object.
  // That was the one place Angular coupling escaped the page object, and it
  // could not survive the migration. It is now a page-object call, which is
  // where every other framework detail already lived (increment-plan §1.4).
  // The condition asserted is unchanged: wait until the screen is not loading.
  await this.flights.waitForIdle();
});

Then('I see a notification containing {string}', async function (fragment) {
  // Polls rather than sampling once: a notification arrives after the request
  // that triggers it settles, so a single read is a race that only shows up
  // when the suite is under load. The assertion itself is unchanged.
  const notification = await this.flights.waitForNotification(fragment);
  assert.ok(
    notification && notification.includes(fragment),
    `expected a notification containing "${fragment}", got "${notification}"`
  );
});

Then('the itinerary is asked to refresh', async function () {
  const count = await this.flights.broadcastCount('itinerary:refresh');
  assert.ok(count > 0, 'expected the app to broadcast itinerary:refresh after booking');
});
