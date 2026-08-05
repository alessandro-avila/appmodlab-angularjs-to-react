/**
 * Step definitions for the hotel booking green baseline.
 *
 * Every assertion here describes what the legacy application does today. When
 * one of these fails, the step is wrong — not the application.
 *
 * Steps are worded so they do not collide with the flight-search steps, which
 * are already approved and must not be edited. Cucumber shares one step
 * registry across every file, so "I sort by ..." and "I see the message ..."
 * belong to flight search and the hotel wording deliberately differs.
 */
const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');

/**
 * Fixed dates used whenever a scenario does not name one. "Today" in the lab
 * environment is 2026-08-05; the check-in picker has minDate 0 and the
 * check-out picker minDate 1, so these are always selectable.
 */
const DEFAULT_CHECK_IN = '08/12/2026';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** "12 August 2026" -> "08/12/2026", the form the datepicker navigates by. */
const toCalendarDate = (phrase) => {
  const m = String(phrase).trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  assert.ok(m, `could not read a date from "${phrase}"`);
  const month = MONTHS.indexOf(m[2]) + 1;
  assert.ok(month > 0, `unknown month in "${phrase}"`);
  return `${String(month).padStart(2, '0')}/${String(Number(m[1])).padStart(2, '0')}/${m[3]}`;
};

/** "12 August 2026" -> "Wed Aug 12 2026", the form Date#toDateString gives. */
const toDateString = (phrase) => {
  const [month, day, year] = toCalendarDate(phrase).split('/').map(Number);
  return new Date(year, month - 1, day).toDateString();
};

const isSorted = (values, direction) =>
  values.every((value, i) =>
    i === 0 || (direction === 'asc' ? values[i - 1] <= value : values[i - 1] >= value));

/** Count of hotel searches the browser has actually sent. */
const hotelSearchCount = (world) =>
  world.requests.filter((r) => /\/api\/hotels(\?|$)/.test(r.url)).length;

// ---------------------------------------------------------------- background

Given('I am on the hotel booking page', async function () {
  await this.hotels.open();
});

// --------------------------------------------------------------- form setup

Given('I have entered {string} as the destination city', async function (city) {
  await this.hotels.setCity(city);
});

Given('I have chosen {string} as the check-out date', async function (phrase) {
  await this.hotels.pickDate('hotelCheckOut', toCalendarDate(phrase));
});

When('I choose {string} as the check-in date', async function (phrase) {
  await this.hotels.pickDate('hotelCheckIn', toCalendarDate(phrase));
});

When('I choose {string} as the check-out date', async function (phrase) {
  await this.hotels.pickDate('hotelCheckOut', toCalendarDate(phrase));
});

// -------------------------------------------------------------------- search

/** Fill the form and search. Dates default when the scenario does not care. */
async function searchHotels(world, city, { nights = 1, rooms = 1 } = {}) {
  await world.hotels.setCity(city);
  await world.hotels.pickDate('hotelCheckIn', DEFAULT_CHECK_IN);
  if (nights !== 1) {
    const [m, d, y] = DEFAULT_CHECK_IN.split('/').map(Number);
    const out = new Date(y, m - 1, d + nights);
    await world.hotels.pickDate('hotelCheckOut',
      `${String(out.getMonth() + 1).padStart(2, '0')}/${String(out.getDate()).padStart(2, '0')}/${out.getFullYear()}`);
  }
  if (rooms !== 1) await world.hotels.setRooms(rooms);
  await world.hotels.search();
  await world.hotels.waitForResults();
}

When('I search for hotels without entering a city', async function () {
  await this.hotels.search();
});

When('I search for hotels without choosing any dates', async function () {
  await this.hotels.search();
});

When('I search for hotels in {string}', async function (city) {
  await searchHotels(this, city);
});

Given('I have searched for hotels in {string}', async function (city) {
  await searchHotels(this, city);
});

When('I search for hotels in {string} staying {int} nights in {int} rooms',
  async function (city, nights, rooms) {
    await searchHotels(this, city, { nights, rooms });
  });

// ---------------------------------------------------------------- validation

Then('I am shown the hotel error {string}', async function (message) {
  const shown = (await this.hotels.error.innerText()).trim();
  assert.strictEqual(shown, message);
});

Then('no hotels are listed', async function () {
  assert.strictEqual(await this.hotels.hotelCount(), 0);
});

Then('at least one hotel is listed', async function () {
  const count = await this.hotels.hotelCount();
  assert.ok(count > 0, `expected at least one hotel, got ${count}`);
});

// --------------------------------------------------------------------- dates

Then('the check-out date is {string}', async function (phrase) {
  const actual = await this.hotels.dateFieldAsCalendarDate('checkOut');
  assert.strictEqual(actual, toDateString(phrase));
});

Then('the stay is shown as {string}', async function (label) {
  assert.strictEqual((await this.hotels.nightLabel.innerText()).trim(), label);
});

Then('the check-in field reads a date string starting {string}', async function (prefix) {
  const text = await this.hotels.dateFieldText('hotelCheckIn');
  assert.ok(text.startsWith(prefix),
    `expected the check-in field to start "${prefix}", it reads "${text}"`);
  assert.ok(/GMT[+-]\d{4}/.test(text),
    `expected a raw Date string with a timezone, got "${text}"`);
});

Then('no night count is shown', async function () {
  assert.strictEqual(await this.hotels.nightCount(), 0);
  assert.strictEqual(await this.hotels.nightLabel.count(), 0);
});

// ------------------------------------------------------------------- results

Then('the hotel count line agrees with the number of hotels listed', async function () {
  const line = (await this.hotels.countLine.innerText()).trim();
  const listed = await this.hotels.hotelCount();
  assert.strictEqual(line, `${listed} hotels found`);
});

Then('every hotel listed is in {string}', async function (city) {
  const hotels = await this.hotels.listedHotels();
  assert.ok(hotels.length > 0, 'expected hotels to compare');
  for (const hotel of hotels) {
    assert.strictEqual(hotel.city, city);
    assert.ok(hotel.name.endsWith(city),
      `expected "${hotel.name}" to be named after ${city}`);
  }
});

Then('I am told how many hotels were found in {string}', async function (city) {
  const listed = await this.hotels.listedHotels();
  const note = await this.hotels.lastNotification();
  assert.strictEqual(note, `Found ${listed.length} hotels in ${city}`);
});

Then('the first hotel card shows a rating word and a review count', async function () {
  const text = await this.hotels.cardText(0);
  assert.ok(/\((Exceptional|Excellent|Very Good|Good|Average) - \d+ reviews\)/.test(text),
    `expected a rating summary in the card, got "${text}"`);
});

Then('the first hotel card total is six times its nightly price', async function () {
  const nightly = await this.hotels.cardNightlyPrice(0);
  const total = await this.hotels.cardTotal(0);
  assert.ok(nightly !== null, 'expected a nightly price on the card');
  assert.strictEqual(total, nightly * 6);
});

Then('the first hotel card shows no address', async function () {
  assert.strictEqual(await this.hotels.cardAddress(0), '');
  const hotels = await this.hotels.listedHotels();
  assert.ok(!('address' in hotels[0]) || hotels[0].address === undefined,
    'expected the API to send no address');
});

// ------------------------------------------------------------------- filters

When('I set the minimum rating to {int} stars', async function (rating) {
  this.searchesBefore = hotelSearchCount(this);
  await this.hotels.setMinRating(rating);
});

When('I set the maximum nightly price to {int}', async function (price) {
  await this.hotels.setMaxPrice(price);
});

Then('the hotel list is filtered without asking the server again', async function () {
  assert.strictEqual(hotelSearchCount(this), this.searchesBefore,
    'expected no further request to /api/hotels');
  const filters = await this.hotels.filters();
  assert.strictEqual(filters.minRating, 4);
});

Then('the hotels listed are exactly those rated {int} stars or better',
  async function (rating) {
    const all = await this.hotels.allHotels();
    const shown = await this.hotels.listedHotels();
    const expected = all.filter((h) => h.rating >= rating).map((h) => h.id).sort();
    assert.deepStrictEqual(shown.map((h) => h.id).sort(), expected,
      `ratings available: ${all.map((h) => h.rating).join(', ')}`);
  });

Then('the hotels listed are exactly those costing {int} or less per night',
  async function (price) {
    const all = await this.hotels.allHotels();
    const shown = await this.hotels.listedHotels();
    const expected = all.filter((h) => h.pricePerNight <= price).map((h) => h.id).sort();
    assert.deepStrictEqual(shown.map((h) => h.id).sort(), expected,
      `prices available: ${all.map((h) => h.pricePerNight).join(', ')}`);
  });

Then('the amenities offered are {string}', async function (list) {
  const expected = list.split(',').map((s) => s.trim());
  assert.deepStrictEqual(await this.hotels.amenityNames(), expected);
});

When('I filter on the amenity {string}', async function (amenity) {
  await this.hotels.toggleAmenity(amenity);
  this.memory.afterFirstAmenity = (await this.hotels.listedHotels()).length;
});

When('I also filter on the amenity {string}', async function (amenity) {
  await this.hotels.toggleAmenity(amenity);
});

Then('the hotels listed are exactly those offering both {string} and {string}',
  async function (first, second) {
    const all = await this.hotels.allHotels();
    const shown = await this.hotels.listedHotels();
    const expected = all
      .filter((h) => h.amenities.includes(first) && h.amenities.includes(second))
      .map((h) => h.id).sort();
    assert.deepStrictEqual(shown.map((h) => h.id).sort(), expected);
    const filters = await this.hotels.filters();
    assert.deepStrictEqual(filters.amenities, [first, second]);
  });

Then('no more hotels are listed than when only {string} was chosen',
  async function (first) {
    const now = (await this.hotels.listedHotels()).length;
    assert.ok(now <= this.memory.afterFirstAmenity,
      `expected at most ${this.memory.afterFirstAmenity} hotels, got ${now}`);
  });

Then('I am told that no hotels match my criteria', async function () {
  assert.strictEqual(await this.hotels.emptyMessage(),
    'No hotels match your criteria. Try adjusting your filters.');
});

// ------------------------------------------------------------------- sorting

When('I order the hotels by {string}', async function (label) {
  await this.hotels.sortBy(label);
});

Then('the hotels are listed from cheapest to dearest', async function () {
  const prices = (await this.hotels.listedHotels()).map((h) => h.pricePerNight);
  assert.ok(prices.length > 1, 'need at least two hotels to judge an order');
  assert.ok(isSorted(prices, 'asc'), `not ascending: ${prices.join(', ')}`);
});

Then('the hotels are listed from dearest to cheapest', async function () {
  const prices = (await this.hotels.listedHotels()).map((h) => h.pricePerNight);
  assert.ok(prices.length > 1, 'need at least two hotels to judge an order');
  assert.ok(isSorted(prices, 'desc'), `not descending: ${prices.join(', ')}`);
});

Then('the hotels are listed from best rated to worst rated', async function () {
  const ratings = (await this.hotels.listedHotels()).map((h) => h.rating);
  assert.ok(ratings.length > 1, 'need at least two hotels to judge an order');
  assert.ok(isSorted(ratings, 'desc'), `not descending: ${ratings.join(', ')}`);
});

Then('every featured hotel is listed before every hotel that is not featured',
  async function () {
    const flags = (await this.hotels.listedHotels()).map((h) => h.featured);
    const lastFeatured = flags.lastIndexOf(true);
    const firstPlain = flags.indexOf(false);
    if (lastFeatured === -1 || firstPlain === -1) return; // nothing to separate
    assert.ok(lastFeatured < firstPlain,
      `featured flags out of order: ${flags.join(', ')}`);
  });

// --------------------------------------------------------------------- rooms

When('I view the rooms of the first hotel', async function () {
  await this.hotels.viewRoomsOf(0);
});

Given('I have viewed the rooms of the first hotel', async function () {
  await this.hotels.viewRoomsOf(0);
});

Then("a room panel opens headed with that hotel's name", async function () {
  const hotels = await this.hotels.listedHotels();
  assert.strictEqual(await this.hotels.roomPanelHeading(), `Rooms at ${hotels[0].name}`);
});

Then('five rooms have been loaded', async function () {
  const rooms = await this.hotels.loadedRooms();
  assert.strictEqual(rooms.length, 5);
  // Each room is priced under "price"; the screen and the booking code both
  // look for "pricePerNight", which is never sent.
  for (const room of rooms) {
    assert.strictEqual(typeof room.price, 'number');
    assert.strictEqual(room.pricePerNight, undefined);
    assert.strictEqual(room.id, undefined);
  }
});

Then('the room table shows no rows', async function () {
  assert.strictEqual(await this.hotels.roomRows.count(), 0);
});

Then('the browser reports a duplicate-key error for the room list', async function () {
  const dupes = this.consoleErrors.filter((e) => e.includes('ngRepeat:dupes'));
  assert.ok(dupes.length > 0,
    `expected an ngRepeat:dupes error, saw: ${this.consoleErrors.join(' | ') || 'none'}`);
  assert.ok(dupes.some((e) => e.includes('room%20in%20selectedHotel.rooms')),
    'expected the duplicate-key error to name the room repeat');
});

Then('there is no room I can select', async function () {
  assert.strictEqual(await this.hotels.page.locator('#hotel-rooms tbody tr button').count(), 0);
});

Then('no booking summary is offered', async function () {
  assert.strictEqual(await this.hotels.summaryPanel.count(), 0);
});

// ------------------------------------------------------------------- booking

Given('I select the first room by driving the controller directly', async function () {
  await this.hotels.selectRoomByDrivingController(0);
});

Then('the booking summary shows no total price', async function () {
  const text = (await this.hotels.summaryTotalText()).trim();
  assert.strictEqual(text, '',
    `expected an empty total, the summary shows "${text}"`);
  // The number behind it is genuinely not a number.
  const computed = await this.hotels.readScope((sc) =>
    Number.isNaN(sc.selectedRoom.pricePerNight * sc.nightCount * sc.searchParams.rooms));
  assert.strictEqual(computed, true, 'expected the computed total to be NaN');
});

When('I confirm the booking', async function () {
  await this.hotels.confirmBooking();
});

/** The body of the booking request the browser sent. */
function bookingBody(world) {
  const req = world.requests
    .filter((r) => r.method === 'POST' && r.url.includes('/api/bookings/hotels'))
    .pop();
  assert.ok(req, 'expected a booking request to have been sent');
  return JSON.parse(req.postData);
}

Then('the booking request carries no room identifier', function () {
  const body = bookingBody(this);
  assert.ok(!('roomId' in body), `roomId was sent as ${JSON.stringify(body.roomId)}`);
  assert.ok(!('roomType' in body), 'no room type is sent either');
});

Then('the booking request prices the stay as nothing', function () {
  const body = bookingBody(this);
  assert.strictEqual(body.totalPrice, null,
    'NaN is serialised as null, so the server is told the stay costs nothing');
});

Then('the booking is accepted', async function () {
  const confirmation = await this.hotels.readScope((sc) =>
    sc.bookingConfirmation ? {
      status: sc.bookingConfirmation.status,
      confirmationNumber: sc.bookingConfirmation.confirmationNumber,
      confirmationCode: sc.bookingConfirmation.confirmationCode
    } : null);
  assert.ok(confirmation, 'expected a confirmation from the server');
  assert.strictEqual(confirmation.status, 'confirmed');
  assert.ok(/^HT/.test(confirmation.confirmationNumber),
    `expected a confirmation number, got ${confirmation.confirmationNumber}`);
  assert.strictEqual(confirmation.confirmationCode, undefined,
    'the field the screen reads is not the field the server sends');
});

Then('the last notification reads {string}', async function (expected) {
  assert.strictEqual(await this.hotels.lastNotification(), expected);
});

Then('the confirmation dialogue shows neither a confirmation code nor a total',
  async function () {
    assert.strictEqual(await this.hotels.modalField('Confirmation Code:'), '');
    assert.strictEqual(await this.hotels.modalField('Total:'), '');
    // The dialogue is open — these blanks are on screen, not hidden.
    const display = await this.hotels.modal.evaluate((el) => getComputedStyle(el).display);
    assert.strictEqual(display, 'block');
  });

// ----------------------------------------------------------- cross-feature

Given('I have selected a flight to {string} on the flight search page',
  async function (destination) {
    await this.flights.open();
    await this.flights.setTripType('one-way');
    await this.flights.setOrigin('SFO');
    await this.flights.setDestination(destination);
    await this.flights.pickDate('departDate', '08/12/2026');
    await this.flights.search();
    await this.flights.waitForResults();
    await this.flights.selectResult(0);
    const selected = await this.flights.readScope((sc) =>
      sc.selectedFlight ? sc.selectedFlight.destination : null);
    assert.strictEqual(selected, destination,
      'the flight must be selected for the event to have been broadcast');
  });

When('I go to the hotel booking page', async function () {
  await this.hotels.open();
});

Then('the destination city is empty', async function () {
  assert.strictEqual(await this.hotels.city.inputValue(), '');
  assert.strictEqual(await this.hotels.readScope((sc) => sc.searchParams.city), '');
});

Then('no check-in date is set', async function () {
  assert.strictEqual(await this.hotels.dateFieldText('hotelCheckIn'), '');
  assert.strictEqual(await this.hotels.readScope((sc) => sc.searchParams.checkIn), null);
});
