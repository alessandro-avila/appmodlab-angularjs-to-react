/**
 * Page Object for the Hotel Booking screen.
 *
 * RE-POINTED IN INCREMENT 2 from the AngularJS screen to the React route
 * (ADR-008 §5, increment-plan §1.4), exactly as flight-search was in
 * Increment 1. Three things changed and nothing else:
 *
 * 1. THE URL — `/#!/hotels` becomes the real path `/hotels` on the front door.
 *
 * 2. DATE ENTRY — the jQuery UI calendar is gone (ADR-007 cat 1), so dates are
 *    set on native date inputs. Constraint C-2 disappears with it, so
 *    `dismissDatePicker` is a no-op kept only so the step definitions do not
 *    have to change.
 *
 * 3. STATE READING — React publishes a scope-shaped snapshot at
 *    `window.__flightSearch.scope` (see `src/lib/test-seam.ts`) carrying the
 *    same property names the AngularJS scope did, so every `pick` the step
 *    definitions already pass keeps working unchanged.
 *
 * ONE METHOD IS RETIRED: `selectRoomByDrivingController`. It existed only
 * because the room table never rendered, so the booking path had no user-facing
 * entry point and the single @bypasses-ui scenario had to reach past the
 * interface. The table renders now, the room is selected the way a user selects
 * it, and the tag is gone — taking the suite from 4 bypasses to 3.
 */
const { BASE_URL } = require('../support/world');

class HotelBookingPage {
  constructor(page) {
    this.page = page;
    this.city = page.locator('#city');
    this.checkIn = page.locator('#hotelCheckIn');
    this.checkOut = page.locator('#hotelCheckOut');
    this.guests = page.locator('#guests');
    this.rooms = page.locator('#rooms');
    this.searchButton = page.getByRole('button', { name: /Search Hotels/i });
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
    await this.page.goto(`${BASE_URL}/hotels`, { waitUntil: 'domcontentloaded' });
    await this.searchButton.waitFor({ state: 'visible' });
    // Wait for the React route to publish its state — the equivalent of the
    // legacy wait for the datepickers wired inside a $timeout(..., 0).
    await this.page.waitForFunction(
      () => !!(window.__flightSearch && window.__flightSearch.scope),
      null, { timeout: 15000 }
    );
  }

  /**
   * Read a value out of the hotel-booking state. `pick` is a fn of the scope.
   *
   * The published snapshot carries the same property names the AngularJS scope
   * did — searchParams, hotels, filteredHotels, selectedHotel, selectedRoom,
   * filters, nightCount, isLoading, hasSearched — so every `pick` written
   * against the legacy app keeps working unchanged.
   */
  async readScope(pick) {
    return this.page.evaluate(
      (pickSrc) => new Function('sc', 'return (' + pickSrc + ')(sc);')(window.__flightSearch.scope),
      pick.toString()
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
   * Set a date. `date` is 'mm/dd/yyyy', the format the scenarios use.
   *
   * A native date input holds `yyyy-mm-dd`, so the conversion happens here
   * rather than in the step definitions.
   */
  async pickDate(field, date) {
    const [month, day, year] = date.split('/').map(Number);
    const pad = (n) => String(n).padStart(2, '0');
    const value = `${year}-${pad(month)}-${pad(day)}`;
    await this.page.locator(`#${field}`).fill(value);
    await this.page.waitForFunction(
      ({ id, expected }) => {
        const el = document.getElementById(id);
        return !!el && el.value === expected;
      },
      { id: field, expected: value },
      { timeout: 5000 }
    );
  }

  /**
   * Kept as a no-op so the step definitions do not change. The legacy jQuery UI
   * calendar rendered inside the document and swallowed pointer events
   * (constraint C-2); a native date input renders its calendar outside the
   * document, so nothing needs dismissing.
   */
  async dismissDatePicker() {
    /* C-2 no longer exists — see the note above. */
  }

  /** The literal text sitting in a date field. */
  async dateFieldText(field) {
    return this.page.locator(`#${field}`).inputValue();
  }

  /**
   * The chosen date as a JS date string, or null when unset.
   *
   * Reads the model rather than the field, because the scenarios that use this
   * compare calendar dates rather than the rendered format.
   */
  async dateFieldAsCalendarDate(which) {
    return this.readScope(
      new Function('sc', `var d = sc.searchParams.${which};` +
        'return d ? new Date(d).toDateString() : null;')
    );
  }

  async nightCount() {
    return this.readScope((sc) => sc.nightCount);
  }

  // ------------------------------------------------------------------ search

  async search() {
    await this.dismissDatePicker();
    await this.searchButton.click();
  }

  /** Wait until the React route has finished a search. */
  async waitForResults() {
    await this.page.waitForFunction(() => {
      const sc = window.__flightSearch && window.__flightSearch.scope;
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

  /**
   * Range inputs reject fill(); set the value and fire the events by hand.
   *
   * Re-pointed in Increment 2: the ranges are now addressed by their own ids
   * rather than by walking up to a `.form-group` wrapper. React tracks the DOM
   * value internally, so the NATIVE value setter is used — assigning
   * `input.value` directly leaves React seeing no change and skipping the
   * re-render.
   */
  async setRange(inputId, value) {
    await this.page.locator(`#${inputId}`).evaluate((input, v) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      ).set;
      setter.call(input, String(v));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }

  async setMinRating(value) {
    await this.setRange('minRating', value);
  }

  async setMaxPrice(value) {
    await this.setRange('maxPrice', value);
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
      const sc = window.__flightSearch && window.__flightSearch.scope;
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
   * Select a room the way a user does.
   *
   * Replaces `selectRoomByDrivingController`, which reached past the interface
   * because the table never rendered.
   */
  async selectRoom(index = 0) {
    await this.roomRows.nth(index).getByRole('button', { name: /Select/i }).click();
    await this.summaryPanel.waitFor({ state: 'visible' });
  }

  /** Select a room by its type, which is the only key the payload offers. */
  async selectRoomByType(type) {
    await this.page
      .locator(`[data-testid="room-row"][data-room-type="${type}"]`)
      .getByRole('button', { name: /Select/i })
      .click();
    await this.summaryPanel.waitFor({ state: 'visible' });
  }

  /** Rows whose room is sold out — discovery Q2. */
  async unavailableRoomTypes() {
    return this.page
      .locator('[data-testid="room-row"][data-available="0"]')
      .evaluateAll((rows) => rows.map((r) => r.getAttribute('data-room-type')));
  }

  /** The big total in the booking summary, exactly as rendered. */
  async summaryTotalText() {
    return this.summaryPanel.locator('h2').innerText();
  }

  async confirmBooking() {
    await this.summaryPanel.getByRole('button', { name: /Confirm Booking/i }).click();
    await this.page.waitForFunction(() => {
      const sc = window.__flightSearch && window.__flightSearch.scope;
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
