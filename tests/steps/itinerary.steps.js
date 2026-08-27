/**
 * Step definitions for the itinerary green baseline.
 *
 * Cucumber keeps ONE global step registry, so these phrases are deliberately
 * worded to avoid colliding with the already-approved flight-search and
 * hotel-booking steps. Where a phrase is genuinely shared — signing in,
 * reading the last notification — the existing step is reused rather than
 * redefined.
 */
const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');

const FIRST_ITEM_ID = 'item-1';

/** "$1,330.00" -> 1330 */
const money = (text) => Number(String(text).replace(/[^0-9.-]/g, ''));

// ------------------------------------------------------------------ navigation

Given('I am on the itinerary page', async function () {
  await this.itinerary.open();
});

When('I go to the itinerary page', async function () {
  await this.itinerary.open();
});

// ------------------------------------------------------------- the trip list

Then('the trips listed are {string}', async function (expected) {
  const names = await this.itinerary.tripNames();
  assert.deepStrictEqual(names, expected.split(',').map((s) => s.trim()));
});

Then('the trip {string} shows the dates {string}', async function (trip, dates) {
  assert.strictEqual(await this.itinerary.tripDates(trip), dates);
});

Then('the trip {string} is described as lasting {string}', async function (trip, duration) {
  assert.strictEqual(await this.itinerary.tripDuration(trip), duration);
});

Then('the server describes every trip as {string}', async function (status) {
  const trips = await this.itinerary.serverTrips();
  assert.ok(trips.length > 0, 'expected the server to return at least one trip');
  for (const t of trips) {
    assert.strictEqual(t.status, status, `expected the server to call ${t.id} "${status}"`);
  }
});

Then('the trip {string} is shown as {string}', async function (trip, status) {
  assert.strictEqual(await this.itinerary.tripStatusLabel(trip), status);
});

Then('no trip shows a countdown to departure', async function () {
  assert.strictEqual(await this.itinerary.countdownCount(), 0);
});

Then('the server prices the trip {string} at {int}', async function (tripId, amount) {
  const trips = await this.itinerary.serverTrips();
  const trip = trips.find((t) => t.id === tripId);
  assert.ok(trip, `expected the server to know about ${tripId}`);
  assert.strictEqual(trip.totalCost, amount);
});

Then('the trip {string} is priced at {string}', async function (trip, price) {
  assert.strictEqual(await this.itinerary.tripPrice(trip), price);
});

Then('no trip in the list shows a destination', async function () {
  const destinations = await this.itinerary.tripDestinations();
  assert.ok(destinations.length > 0, 'expected a destination binding on every trip row');
  for (const d of destinations) {
    assert.strictEqual(d.trim(), '', 'expected the destination binding to render empty');
  }
});

Then('the open trip is {string}', async function (name) {
  assert.strictEqual(await this.itinerary.openTripName(), name);
});

When('I open the trip {string}', async function (name) {
  await this.itinerary.openTrip(name);
});

// ---------------------------------------------------------- the trip summary

Then('the summary cards read:', async function (table) {
  const expected = table.raw().map(([label, amount]) => ({ label, amount }));
  const actual = await this.itinerary.summary();
  assert.deepStrictEqual(actual, expected);
});

Then('the summary cards do not add up to the total shown', async function () {
  const cards = await this.itinerary.summary();
  const total = money(cards.find((c) => c.label === 'Total').amount);
  const parts = cards.filter((c) => c.label !== 'Total').reduce((a, c) => a + money(c.amount), 0);
  assert.notStrictEqual(parts, total, `expected the cards (${parts}) to disagree with the total (${total})`);
});

Then('the summary cards do add up to the total shown', async function () {
  const cards = await this.itinerary.summary();
  const total = money(cards.find((c) => c.label === 'Total').amount);
  const parts = cards.filter((c) => c.label !== 'Total').reduce((a, c) => a + money(c.amount), 0);
  assert.strictEqual(parts, total);
});

Then('the details heading begins {string}', async function (prefix) {
  const heading = await this.itinerary.headingTitlePart();
  assert.ok(heading.startsWith(prefix), `expected "${heading}" to begin "${prefix}"`);
});

Then('the details heading has nothing after the separator', async function () {
  const heading = await this.itinerary.headingTitlePart();
  const after = heading.split('—')[1];
  assert.strictEqual((after || '').trim(), '', `expected nothing after the dash, found "${after}"`);
});

Then('the trip total reads {string}', async function (total) {
  const cards = await this.itinerary.summary();
  assert.strictEqual(cards.find((c) => c.label === 'Total').amount, total);
});

Then('the trip total still reads {string}', async function (total) {
  const cards = await this.itinerary.summary();
  assert.strictEqual(cards.find((c) => c.label === 'Total').amount, total);
});

// ------------------------------------------------------------ day breakdown

Then('the days shown are {string}', async function (expected) {
  const labels = await this.itinerary.dayLabels();
  assert.deepStrictEqual(labels, expected.split(',').map((s) => s.trim()));
});

Then('the day headings read:', async function (table) {
  const expected = table.raw().map(([text]) => text.trim());
  const actual = await this.itinerary.dayHeadingTexts();
  assert.deepStrictEqual(actual, expected);
});

Then('the items on {string} are ordered {string}', async function (day, expected) {
  const items = await this.itinerary.itemDescriptionsOn(day);
  assert.deepStrictEqual(items, expected.split(',').map((s) => s.trim()));
});

Then('no itinerary row shows a headline', async function () {
  const headlines = await this.itinerary.itemHeadlines();
  assert.ok(headlines.length > 0, 'expected a headline binding on every row');
  for (const h of headlines) {
    assert.strictEqual(h, '', 'expected the headline binding to render empty');
  }
});

Then('the first itinerary row describes {string}', async function (description) {
  const descriptions = await this.itinerary.itemDescriptions();
  assert.strictEqual(descriptions[0], description);
});

Then('the first itinerary row reads the time {string}', async function (time) {
  assert.strictEqual(await this.itinerary.rowTime(0), time);
});

Then('the first itinerary row is labelled {string}', async function (status) {
  assert.strictEqual(await this.itinerary.rowStatus(0), status);
});

Then('the first itinerary row costs {string}', async function (cost) {
  assert.strictEqual(await this.itinerary.rowCost(0), cost);
});

// ------------------------------------------------------------ status filter

When('I filter the itinerary by {string}', async function (status) {
  await this.itinerary.filterBy(status);
});

Then('the {string} filter button is highlighted', async function (status) {
  assert.ok(
    await this.itinerary.filterButtonIsHighlighted(status),
    `expected the "${status}" button to look selected`
  );
});

Then('all {int} days are still shown', async function (count) {
  assert.strictEqual(await this.itinerary.dayPanels.count(), count);
});

Then('only {int} day is still shown', async function (count) {
  assert.strictEqual(await this.itinerary.dayPanels.count(), count);
});

Then('the statuses still shown are {string}', async function (expected) {
  const statuses = await this.itinerary.itemStatuses();
  assert.deepStrictEqual(statuses, expected.split(',').map((s) => s.trim()));
});

Then('the controller still holds the status filter {string}', async function (status) {
  assert.strictEqual(await this.itinerary.controllerFilterStatus(), status);
});

Then('the controller has computed no filtered days', async function () {
  assert.strictEqual(
    await this.itinerary.controllerHasComputedDays(),
    false,
    'expected displayDays to have never been computed'
  );
});

When('I set the status filter to {string} on the controller directly', async function (status) {
  await this.itinerary.setFilterByDrivingController(status);
});

// ------------------------------------------------------------ switching trips

When('I scroll back to the top', async function () {
  await this.page.evaluate(() => window.scrollTo(0, 0));
  await this.page.waitForTimeout(400);
  this.scrollBefore = await this.page.evaluate(() => window.scrollY);
  assert.strictEqual(this.scrollBefore, 0, 'expected to be at the top of the page');
});

Then('the page has scrolled away from the top', async function () {
  const after = await this.page.evaluate(() => window.scrollY);
  assert.ok(after > 0, `expected the page to have scrolled down, still at ${after}`);
});

// -------------------------------------------------------------------- notes

When('I type the note {string} against the first itinerary row', async function (text) {
  this.typedNote = text;
  await this.itinerary.typeNote(0, text);
});

When('I add that note', async function () {
  this.requests.length = 0;
  this.notificationsBefore = await this.itinerary.notificationCount();
  await this.itinerary.addNoteButton(0).click();
  await this.page.waitForTimeout(1500);
});

Then('no note request is sent', async function () {
  const notes = this.requests.filter((r) => /\/notes$/.test(r.url));
  assert.deepStrictEqual(notes, [], `expected no note request, saw ${JSON.stringify(notes)}`);
});

Then('the first itinerary row carries no note', async function () {
  assert.deepStrictEqual(await this.itinerary.notesOn(0), []);
});

Then('the note I typed is still sitting in the box', async function () {
  assert.strictEqual(await this.itinerary.noteBoxValue(0), this.typedNote);
});

Then('no notification is raised', async function () {
  assert.strictEqual(
    await this.itinerary.notificationCount(),
    this.notificationsBefore,
    'expected the notification count to be unchanged'
  );
});

Then("the controller's note box is empty", async function () {
  assert.strictEqual(await this.itinerary.controllerNoteBox(), '');
});

When('I add the note {string} by driving the controller directly', async function (text) {
  this.requests.length = 0;
  this.typedNote = text;
  await this.itinerary.addNoteByDrivingController(FIRST_ITEM_ID, text);
});

Then('the first itinerary row shows a note reading {string}', async function (text) {
  const notes = await this.itinerary.notesOn(0);
  assert.ok(notes.length > 0, 'expected the row to show a note');
  assert.ok(notes.some((n) => n.includes(text)), `expected a note containing "${text}", saw ${JSON.stringify(notes)}`);
});

Then('that note is attributed to {string}', async function (author) {
  const notes = await this.itinerary.notesOn(0);
  assert.ok(notes.some((n) => n.startsWith(author)), `expected a note by ${author}, saw ${JSON.stringify(notes)}`);
});

Then('the portal does not remember who is signed in', async function () {
  const identity = await this.itinerary.signedInIdentity();
  assert.strictEqual(identity.currentUser, null, 'expected no signed-in user on the root scope');
  assert.deepStrictEqual(identity.storedKeys, ['authToken'], 'expected only the token to be stored');
});

Then('a note request is sent carrying the text but no author', async function () {
  const notes = this.requests.filter((r) => /\/notes$/.test(r.url));
  assert.strictEqual(notes.length, 1, `expected exactly one note request, saw ${notes.length}`);
  const body = JSON.parse(notes[0].postData);
  assert.strictEqual(body.text, this.typedNote);
  assert.ok(body.createdAt, 'expected the request to carry a timestamp');
  assert.strictEqual(body.author, undefined, 'expected the request to carry no author');
});

Then('the server has stored no note against that item', async function () {
  const item = await this.itinerary.serverItem('trip-1', FIRST_ITEM_ID);
  assert.ok(item, 'expected the server to still know the item');
  assert.strictEqual(item.notes, undefined, `expected no stored note, saw ${JSON.stringify(item.notes)}`);
});

// --------------------------------------------------------------- cancelling

When('I cancel the item {string}', async function (description) {
  this.requests.length = 0;
  this.dialogs = await this.itinerary.cancelItem(description, { accept: true });
});

When('I decline to confirm cancelling the item {string}', async function (description) {
  this.requests.length = 0;
  this.dialogs = await this.itinerary.cancelItem(description, { accept: false });
});

Then('I am asked {string}', function (message) {
  assert.ok(this.dialogs.length > 0, 'expected a confirmation dialogue');
  assert.strictEqual(this.dialogs[0].type, 'confirm');
  assert.strictEqual(this.dialogs[0].message, message);
});

Then('no cancellation request is sent', function () {
  const puts = this.requests.filter((r) => r.method === 'PUT' && /itinerary-items/.test(r.url));
  assert.deepStrictEqual(puts, [], `expected no cancellation, saw ${JSON.stringify(puts)}`);
});

Then('a cancellation request is sent for that item', function () {
  const puts = this.requests.filter((r) => r.method === 'PUT' && /itinerary-items/.test(r.url));
  assert.strictEqual(puts.length, 1, `expected one cancellation request, saw ${puts.length}`);
  assert.deepStrictEqual(JSON.parse(puts[0].postData), { status: 'cancelled' });
});

Then('the item {string} is still labelled {string}', async function (description, status) {
  assert.strictEqual(await this.itinerary.itemLabel(description), status);
});

Then('the item {string} is labelled {string}', async function (description, status) {
  assert.strictEqual(await this.itinerary.itemLabel(description), status);
});

Then('the item {string} is shown in the cancelled style', async function (description) {
  const cls = await this.itinerary.itemRowClass(description);
  assert.ok(/list-group-item-danger/.test(cls), `expected the cancelled style, class was "${cls}"`);
});

Then('the item {string} can no longer be cancelled', async function (description) {
  assert.strictEqual(
    await this.itinerary.itemHasCancelButton(description),
    false,
    'expected the Cancel button to be gone'
  );
});

// --------------------------------------------------------------- view modes

When('I switch to the timeline view', async function () {
  await this.itinerary.switchToTimeline();
});

When('I switch back to the list view', async function () {
  await this.itinerary.switchToList();
});

Then('the list view is no longer on the page', async function () {
  assert.strictEqual(await this.itinerary.listViewIsPresent(), false);
});

Then('the list view is on the page again', async function () {
  assert.strictEqual(await this.itinerary.listViewIsPresent(), true);
});

Then('the timeline shows {int} entries', async function (count) {
  assert.strictEqual(await this.itinerary.timelineEntries.count(), count);
});

Then('the timeline shows no costs', async function () {
  const text = await this.itinerary.timelineText();
  assert.ok(!text.includes('$'), `expected no prices in the timeline, saw "${text}"`);
});

// -------------------------------------------------- cross-feature coupling

Given('I note how many itinerary items exist', async function () {
  const trips = await this.itinerary.serverTrips();
  this.itemsBefore = trips.reduce((a, t) => a + t.items.length, 0);
  this.itemIdsBefore = trips.flatMap((t) => t.items.map((i) => i.id));
  assert.ok(this.itemsBefore > 0, 'expected the fixtures to contain itinerary items');
});

When('I book a flight from the flight search page', async function () {
  await this.flights.open();
  await this.flights.setOrigin('San Francisco');
  await this.flights.setDestination('New York');
  await this.flights.setTripType('round-trip');
  await this.flights.pickDate('departDate', '08/15/2026');
  await this.flights.pickDate('returnDate', '08/20/2026');
  await this.flights.searchAndWait();
  await this.flights.selectResult(0);
  this.requests.length = 0;
  await this.flights.book();
  await this.page.waitForTimeout(2000);
});

Then('the flight booking is accepted', function () {
  const posts = this.requests.filter((r) => r.method === 'POST' && /\/book$/.test(r.url));
  assert.strictEqual(posts.length, 1, `expected one booking request, saw ${posts.length}`);
});

// --------------------------------------------------------------------- SEAM-3
//
// Until Increment 3 both booking endpoints echoed their request and wrote
// nothing, so the two steps here asserted the ABSENCE of an itinerary item.
// Q-3 / SEAM-3 / ADR-020 connected the seam; these now assert its presence.

Then('one more itinerary item exists than before', async function () {
  const trips = await this.itinerary.serverTrips();
  const after = trips.reduce((a, t) => a + t.items.length, 0);
  assert.strictEqual(
    after,
    this.itemsBefore + 1,
    `expected the booking to add exactly one item (had ${this.itemsBefore}, now ${after})`
  );
});

/** The item the booking just created, whichever trip it landed on. */
async function addedItem(world) {
  const trips = await world.itinerary.serverTrips();
  const added = trips
    .flatMap((t) => t.items)
    .filter((i) => !world.itemIdsBefore.includes(i.id));
  assert.strictEqual(added.length, 1, `expected exactly one new item, saw ${added.length}`);
  return added[0];
}

Then('the itinerary shows the newly booked flight', async function () {
  const item = await addedItem(this);
  assert.strictEqual(item.type, 'flight', 'the new item should be a flight');
  await this.itinerary.open();
  const descriptions = await this.itinerary.itemDescriptions();
  assert.ok(
    descriptions.includes(item.description),
    `expected the itinerary to show "${item.description}", saw ${JSON.stringify(descriptions)}`
  );
});

When('I book a hotel from the hotel booking page', async function () {
  await this.hotels.open();
  await this.hotels.setCity('Boston');
  await this.hotels.pickDate('hotelCheckIn', '09/01/2026');
  await this.hotels.pickDate('hotelCheckOut', '09/04/2026');
  await this.hotels.search();
  await this.hotels.waitForResults();
  await this.hotels.viewRoomsOf(0);
  await this.hotels.selectRoom(0);
  this.requests.length = 0;
  await this.hotels.confirmBooking();
  await this.page.waitForTimeout(2000);
});

Then('the hotel booking is accepted', function () {
  const posts = this.requests.filter(
    (r) => r.method === 'POST' && r.url.includes('/api/bookings/hotels')
  );
  assert.strictEqual(posts.length, 1, `expected one booking request, saw ${posts.length}`);
});

Then('the itinerary shows the newly booked hotel', async function () {
  const item = await addedItem(this);
  assert.strictEqual(item.type, 'hotel', 'the new item should be a hotel');
  await this.itinerary.open();
  const descriptions = await this.itinerary.itemDescriptions();
  assert.ok(
    descriptions.includes(item.description),
    `expected the itinerary to show "${item.description}", saw ${JSON.stringify(descriptions)}`
  );
});

// -------------------------------------------------------------------- printing
//
// ADR-017. The legacy cloned #itinerary-details into a popup; printing now
// prints the live document behind a @media print stylesheet. `window.print` is
// stubbed so the native dialog never opens, and `window.open` is wrapped so the
// absence of a second window can be asserted rather than assumed.

When('I print the itinerary', async function () {
  await this.itinerary.stubPrint();
  await this.itinerary.clickPrint();
  this.printRecord = await this.itinerary.printRecord();
});

Then('the browser is asked to print', function () {
  assert.strictEqual(this.printRecord.printed, 1, 'expected window.print() to be called once');
});

Then('no second window is opened', function () {
  assert.strictEqual(this.printRecord.opened, 0, 'expected no window.open() call');
});

Then('the printed itinerary includes the trip summary', async function () {
  const styles = await this.itinerary.printStyles();
  assert.match(styles, /@media print/, 'expected a print stylesheet');
  assert.match(
    styles,
    /#itinerary-details\s*\{\s*display:\s*block/,
    'expected #itinerary-details to remain visible in print'
  );
  const text = await this.itinerary.printRegionText();
  assert.match(text, /NYC Business Trip/);
  assert.match(text, /\$1,330\.00/);
});

Then('the printed itinerary includes every day of the trip', async function () {
  const labels = await this.itinerary.dayLabels();
  assert.deepStrictEqual(labels, ['Day 1', 'Day 2', 'Day 4']);
});

Then('the printed itinerary leaves out the buttons', async function () {
  const styles = await this.itinerary.printStyles();
  assert.match(
    styles,
    /#itinerary-details \.btn[\s\S]*?display:\s*none/,
    'expected buttons inside the details to be hidden in print'
  );
});

Then('the printed itinerary leaves out the note boxes', async function () {
  const styles = await this.itinerary.printStyles();
  assert.match(styles, /\.no-print[\s\S]*?display:\s*none/, 'expected .no-print to be hidden');
  const regions = await this.itinerary.noPrintCount();
  assert.ok(regions > 0, 'expected the note composers and cancel column to be marked .no-print');
});

Then('the document was titled {string} while printing', function (title) {
  assert.strictEqual(this.printRecord.titleWhilePrinting, title);
});

Then('the document title is restored afterwards', async function () {
  const now = await this.page.title();
  assert.notStrictEqual(now, 'Itinerary', 'expected the document title to be put back');
});
