/**
 * Page Object for the Hotel Booking screen of the legacy AngularJS portal.
 *
 * It follows the same two rules as the flight-search page object:
 *
 * 1. Dates go through the jQuery UI calendar, never through typing. The inputs
 *    are plain text fields upgraded by `$('#hotelCheckIn').datepicker(...)`, and
 *    a typed value never fires `onSelect`, so the Angular model would stay null
 *    while the field looked filled. The open calendar swallows pointer events
 *    (constraint C-2 in ADR-003), so it is dismissed with Escape afterwards.
 *
 * 2. Assertions read the DOM wherever the screen renders the value. The scope is
 *    read only for things the screen genuinely does not show — the loaded room
 *    list behind the empty table, the numeric slider values, and the `featured`
 *    flag used by the recommended ordering.
 *
 * One method here deliberately breaks the "drive it like a user" rule:
 * `selectRoomByDrivingController`. It exists because the room table renders no
 * rows at all, so the booking path has no user-facing entry point. It is used by
 * exactly one scenario, which is tagged @bypasses-ui and says so in its name.
 */
const { BASE_URL } = require('../support/world');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** Runs in the browser: find the hotel-booking scope from the container. */
function scopeReader(pickSource) {
  /* global angular, document */
  let sc = angular.element(
    document.querySelector('.hotel-booking-container') || document.body
  ).scope();
  while (sc && !sc.searchParams) sc = sc.$parent;
  if (!sc) return null;
  // eslint-disable-next-line no-new-func
  return new Function('sc', 'return (' + pickSource + ')(sc);')(sc);
}

class HotelBookingPage {
  constructor(page) {
    this.page = page;
    this.city = page.locator('#city');
    this.checkIn = page.locator('#hotelCheckIn');
    this.checkOut = page.locator('#hotelCheckOut');
    this.guests = page.locator('#guests');
    this.rooms = page.locator('#rooms');
    this.searchButton = page.getByRole('button', { name: /Search Hotels/i });
    this.picker = page.locator('#ui-datepicker-div');
    this.error = page.locator('.alert-danger');
    this.nightLabel = page.locator('.label-info');
    this.filterPanel = page.locator('.col-md-3 .panel-default');
    this.sortSelect = page.locator('.col-md-3 select');
    this.countLine = page.locator('.col-md-9 > p.text-muted');
    this.hotelCards = page.locator('.col-md-9 > .panel-default');
    this.roomsPanel = page.locator('#hotel-rooms');
    this.roomRows = page.locator('#hotel-rooms tbody tr');
    this.summaryPanel = page.locator('.panel-success');
    this.modal = page.locator('#bookingConfirmationModal');
  }

  // ---------------------------------------------------------------- navigation

  async open() {
    await this.page.goto(`${BASE_URL}/#!/hotels`, { waitUntil: 'domcontentloaded' });
    await this.searchButton.waitFor({ state: 'visible' });
    // The datepickers are wired inside a $timeout(..., 0); wait for that.
    await this.page.waitForFunction(
      () => !!(window.jQuery && window.jQuery('#hotelCheckIn').data('datepicker')),
      null, { timeout: 15000 }
    );
  }

  /** Read a value out of the hotel-booking scope. `pick` is a fn of the scope. */
  async readScope(pick) {
    return this.page.evaluate(
      ({ src, pickSrc }) => new Function('pickSource', 'return (' + src + ')(pickSource);')(pickSrc),
      { src: scopeReader.toString(), pickSrc: pick.toString() }
    );
  }

  // ------------------------------------------------------------------- inputs

  async setCity(value) {
    await this.city.fill(value);
  }

  async setGuests(value) {
    await this.guests.selectOption({ label: String(value) });
  }

  async setRooms(value) {
    await this.rooms.selectOption({ label: String(value) });
  }

  /**
   * Pick a date through the calendar widget. `date` is 'mm/dd/yyyy'.
   *
   * The day is selected with a dispatched click for the same reason as on the
   * flight page: once results are on screen the calendar can be overlapped by
   * the cards above it. Dispatching keeps that from blocking scenarios that
   * merely need a date set.
   */
  async pickDate(field, date) {
    const [month, day, year] = date.split('/').map(Number);
    await this.page.locator(`#${field}`).click();
    await this.picker.waitFor({ state: 'visible' });

    for (let hop = 0; hop < 48; hop++) {
      const title = (await this.picker.locator('.ui-datepicker-title').innerText()).trim();
      const [monthName, yearText] = title.split(/\s+/);
      const shownMonth = MONTHS.indexOf(monthName) + 1;
      const shownYear = Number(yearText);
      if (shownMonth === month && shownYear === year) break;
      const forward = year > shownYear || (year === shownYear && month > shownMonth);
      await this.picker.locator(forward ? 'a.ui-datepicker-next' : 'a.ui-datepicker-prev').click();
    }

    await this.picker
      .locator('td[data-handler="selectDay"] a')
      .filter({ hasText: new RegExp(`^${day}$`) })
      .dispatchEvent('click');
    await this.dismissDatePicker();
  }

  /** The open calendar intercepts clicks (C-2). Always close it before acting. */
  async dismissDatePicker() {
    if (await this.picker.isVisible().catch(() => false)) {
      await this.page.keyboard.press('Escape');
      await this.picker.waitFor({ state: 'hidden' }).catch(() => {});
    }
  }

  /** The literal text sitting in a date field, object string and all. */
  async dateFieldText(field) {
    return this.page.locator(`#${field}`).inputValue();
  }

  /** The bound Date, normalised to 'mm/dd/yyyy', or null when unset. */
  async dateFieldAsCalendarDate(which) {
    const iso = await this.readScope(
      new Function('sc', `var d = sc.searchParams.${which};` +
        'return d ? new Date(d).toDateString() : null;')
    );
    return iso;
  }

  async nightCount() {
    return this.readScope((sc) => sc.nightCount);
  }

  // ------------------------------------------------------------------ search

  async search() {
    await this.dismissDatePicker();
    await this.searchButton.click();
  }

  /** Wait until the controller has finished a search. */
  async waitForResults() {
    await this.page.waitForFunction(() => {
      const el = document.querySelector('.hotel-booking-container');
      if (!el) return false;
      let sc = angular.element(el).scope();
      while (sc && !sc.searchParams) sc = sc.$parent;
      return !!sc && sc.isLoading === false && sc.hasSearched === true;
    }, null, { timeout: 20000 });
  }

  async hotelCount() {
    return this.hotelCards.count();
  }

  /** The listed hotels, as the controller sees them. */
  async listedHotels() {
    return this.readScope((sc) => sc.filteredHotels.map((h) => ({
      id: h.id,
      name: h.name,
      city: h.city,
      rating: h.rating,
      pricePerNight: h.pricePerNight,
      featured: !!h.featured,
      amenities: (h.amenities || []).slice()
    })));
  }

  /**
   * Everything the search returned, before filtering. Filter assertions compare
   * against this rather than demanding a non-empty result: prices and ratings
   * are random, so any given threshold may legitimately match nothing.
   */
  async allHotels() {
    return this.readScope((sc) => sc.hotels.map((h) => ({
      id: h.id,
      name: h.name,
      rating: h.rating,
      pricePerNight: h.pricePerNight,
      amenities: (h.amenities || []).slice()
    })));
  }

  async cardText(index = 0) {
    return (await this.hotelCards.nth(index).innerText()).replace(/\s+/g, ' ').trim();
  }

  /** The "Total: $x" line of a card, or null when the card shows none. */
  async cardTotal(index = 0) {
    const line = this.hotelCards.nth(index).locator('.text-right p strong');
    if (!(await line.count())) return null;
    const text = await line.innerText();
    const m = text.match(/([\d,]+\.\d{2})/);
    return m ? Number(m[1].replace(/,/g, '')) : null;
  }

  async cardNightlyPrice(index = 0) {
    const text = await this.hotelCards.nth(index).locator('h3.text-primary').innerText();
    const m = text.match(/([\d,]+\.\d{2})/);
    return m ? Number(m[1].replace(/,/g, '')) : null;
  }

  /** The address line of a card. It has a map marker icon and nothing else. */
  async cardAddress(index = 0) {
    const p = this.hotelCards.nth(index).locator('p.text-muted').first();
    return (await p.innerText()).trim();
  }

  // ----------------------------------------------------------------- filters

  /** Range inputs reject fill(); set the value and fire the events by hand. */
  async setRange(labelFragment, value) {
    await this.page.evaluate(({ labelFragment, value }) => {
      const group = [...document.querySelectorAll('.col-md-3 .form-group')]
        .find((g) => g.querySelector('label') &&
          g.querySelector('label').textContent.includes(labelFragment));
      const input = group.querySelector('input[type=range]');
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, { labelFragment, value });
  }

  async setMinRating(value) {
    await this.setRange('Min Rating', value);
  }

  async setMaxPrice(value) {
    await this.setRange('Max Price', value);
  }

  async filters() {
    return this.readScope((sc) => ({
      minRating: sc.filters.minRating,
      maxPrice: sc.filters.maxPrice,
      amenities: sc.filters.amenities.slice(),
      sortBy: sc.filters.sortBy
    }));
  }

  async amenityNames() {
    const labels = await this.page.locator('.col-md-3 .checkbox label').allInnerTexts();
    return labels.map((l) => l.trim());
  }

  /**
   * Click an amenity checkbox by position. The label wraps the input, so its
   * text carries the input's own whitespace and an anchored text match on the
   * label never lines up. Position is taken from the rendered list itself.
   */
  async toggleAmenity(name) {
    const names = await this.amenityNames();
    const index = names.indexOf(name);
    if (index === -1) {
      throw new Error(`no amenity named "${name}"; offered: ${names.join(', ')}`);
    }
    await this.page.locator('.col-md-3 .checkbox input[type=checkbox]').nth(index).click();
  }

  async sortBy(optionLabel) {
    await this.sortSelect.selectOption({ label: optionLabel });
  }

  async emptyMessage() {
    const el = this.page.locator('.col-md-9 .text-center p');
    return (await el.count()) ? (await el.innerText()).trim() : null;
  }

  // ------------------------------------------------------------------- rooms

  async viewRoomsOf(index = 0) {
    await this.hotelCards.nth(index).getByRole('button', { name: /View Rooms/i }).click();
    await this.page.waitForFunction(() => {
      const el = document.querySelector('.hotel-booking-container');
      let sc = angular.element(el).scope();
      while (sc && !sc.searchParams) sc = sc.$parent;
      return !!sc && sc.isLoading === false && !!sc.selectedHotel;
    }, null, { timeout: 20000 });
  }

  /** Rooms held by the controller — five of them, none of which render. */
  async loadedRooms() {
    return this.readScope((sc) => (sc.selectedHotel && sc.selectedHotel.rooms || [])
      .map((r) => ({
        type: r.type,
        price: r.price,
        pricePerNight: r.pricePerNight,
        id: r.id,
        beds: r.beds,
        maxGuests: r.maxGuests
      })));
  }

  async roomPanelHeading() {
    return (await this.roomsPanel.locator('.panel-title').innerText()).trim();
  }

  /**
   * The only way to reach the booking code, because the table is empty.
   * Used by the single @bypasses-ui scenario.
   */
  async selectRoomByDrivingController(index = 0) {
    await this.page.evaluate((index) => {
      const el = document.querySelector('.hotel-booking-container');
      let sc = angular.element(el).scope();
      while (sc && !sc.searchParams) sc = sc.$parent;
      sc.$apply(() => sc.selectRoom(sc.selectedHotel.rooms[index]));
    }, index);
    await this.summaryPanel.waitFor({ state: 'visible' });
  }

  /** The big total in the booking summary, exactly as rendered. */
  async summaryTotalText() {
    return this.summaryPanel.locator('h2').innerText();
  }

  async confirmBooking() {
    await this.summaryPanel.getByRole('button', { name: /Confirm Booking/i }).click();
    await this.page.waitForFunction(() => {
      const el = document.querySelector('.hotel-booking-container');
      let sc = angular.element(el).scope();
      while (sc && !sc.searchParams) sc = sc.$parent;
      return !!sc && sc.isLoading === false;
    }, null, { timeout: 20000 });
    // Bootstrap fades the dialogue in after the promise settles; give it that
    // moment so assertions see the state the user ends up looking at.
    await this.modal.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }

  async modalText() {
    return (await this.modal.innerText()).replace(/\s+/g, ' ').trim();
  }

  async modalField(label) {
    const rows = await this.modal.locator('.modal-body p').allInnerTexts();
    const row = rows.find((r) => r.trim().startsWith(label));
    return row === undefined ? null : row.replace(label, '').trim();
  }

  // ----------------------------------------------------------- notifications

  /**
   * Notifications are pushed onto $rootScope and never removed, so the current
   * one is the last in the list.
   */
  async lastNotification() {
    const alerts = this.page.locator('.notification-area .alert');
    const n = await alerts.count();
    if (!n) return null;
    return (await alerts.nth(n - 1).innerText()).trim();
  }
}

module.exports = HotelBookingPage;
