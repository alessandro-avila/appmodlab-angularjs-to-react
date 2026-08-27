/**
 * Page Object for the Flight Search screen.
 *
 * RE-POINTED IN INCREMENT 1 from the AngularJS screen to the React route
 * (ADR-008 §5, increment-plan §1.4: "the page object changes the URL it opens
 * and the selectors it uses. The feature file and the step definitions do not
 * change unless a scenario is superseded.")
 *
 * Three things changed and nothing else:
 *
 * 1. THE URL. `/#!/flights` on the legacy static server becomes the real path
 *    `/flights` on the front door. React routes are real paths, because a
 *    fragment is never sent to the server and route ownership would otherwise
 *    be inexpressible (ADR-012, increment-plan §1.2).
 *
 * 2. DATE ENTRY. The jQuery UI calendar is gone (ADR-007 category 1), so
 *    `pickDate` sets a native <input type="date"> instead of walking a widget.
 *    That also removes constraint C-2 — there is no in-page popup left to
 *    swallow pointer events — so `dismissDatePicker` becomes a no-op, kept only
 *    so the step definitions do not have to change.
 *
 * 3. STATE READING. A few assertions read values the screen genuinely does not
 *    render — chiefly the numeric `filters.maxPrice` behind the range slider and
 *    the `priceRange` it derives from. AngularJS exposed these through
 *    `angular.element(...).scope()`. React publishes the same SCOPE-SHAPED
 *    snapshot at `window.__flightSearch.scope` (see `src/lib/test-seam.ts`), so
 *    `readScope(pick)` keeps working with the exact same `pick` functions the
 *    step definitions already pass.
 *
 * Everything a user can see is still asserted through the DOM.
 */
const { BASE_URL } = require('../support/world');

class FlightSearchPage {
  constructor(page) {
    this.page = page;
    this.origin = page.locator('#origin');
    this.destination = page.locator('#destination');
    this.passengers = page.locator('#passengers');
    this.cabinClass = page.locator('#cabinClass');
    this.searchButton = page.getByRole('button', { name: /Search Flights/i });
    this.overlay = page.locator('#search-overlay');
    this.results = page.locator('.list-group a.list-group-item');
    this.detailsPanel = page.locator('#flight-details');
  }

  // ---------------------------------------------------------------- navigation

  async open() {
    await this.page.goto(`${BASE_URL}/flights`, { waitUntil: 'domcontentloaded' });
    await this.searchButton.waitFor({ state: 'visible' });
    // Wait for the React route to publish its state — the equivalent of the
    // legacy wait for the datepickers wired inside a $timeout(..., 0).
    await this.page.waitForFunction(
      () => !!(window.__flightSearch && window.__flightSearch.scope),
      null,
      { timeout: 15000 }
    );
  }

  /**
   * Read a value out of the flight-search state. `pick` is a fn of the scope.
   *
   * The published snapshot carries the same property names the AngularJS scope
   * did — searchParams, filters, priceRange, flights, filteredFlights,
   * airlines, sortField, sortReverse, isLoading, hasSearched — so every `pick`
   * written against the legacy app keeps working unchanged.
   */
  async readScope(pick) {
    return this.page.evaluate(
      (pickSrc) => new Function('sc', 'return (' + pickSrc + ')(sc);')(window.__flightSearch.scope),
      pick.toString()
    );
  }

  // ------------------------------------------------------------------- inputs

  async setTripType(type) {
    const label = type === 'one-way' ? 'One Way' : 'Round Trip';
    await this.page.getByRole('button', { name: label, exact: true }).click();
  }

  async setOrigin(value) {
    await this.origin.fill(value);
  }

  async setDestination(value) {
    await this.destination.fill(value);
  }

  async setPassengers(value) {
    await this.passengers.selectOption(String(value));
  }

  async setCabinClass(value) {
    await this.cabinClass.selectOption(value);
  }

  /**
   * Set a date. `date` is 'mm/dd/yyyy', the format the scenarios are written in.
   *
   * A native date input holds `yyyy-mm-dd` in its value, so the scenario's
   * calendar date is converted here rather than in the step definitions.
   * Filling it fires the input event React listens for, which is what a user
   * typing or picking from the browser calendar produces — and is the behaviour
   * the legacy screen could NOT deliver, because a typed value never reached the
   * AngularJS model.
   */
  async pickDate(field, date) {
    const [month, day, year] = date.split('/').map(Number);
    const pad = (n) => String(n).padStart(2, '0');
    await this.page.locator(`#${field}`).fill(`${year}-${pad(month)}-${pad(day)}`);
    await this.page.waitForFunction(
      ({ id, expected }) => {
        const el = document.getElementById(id);
        return !!el && el.value === expected;
      },
      { id: field, expected: `${year}-${pad(month)}-${pad(day)}` },
      { timeout: 5000 }
    );
  }

  /** Used by the net-new "typed departure date" scenario. */
  async typeDate(field, date) {
    await this.pickDate(field, date);
  }

  /**
   * Kept as a no-op so the step definitions do not change.
   *
   * The legacy jQuery UI calendar rendered inside the document and swallowed
   * pointer events, so every scenario had to dismiss it before clicking
   * anything (constraint C-2 in ADR-003). A native date input renders its
   * calendar outside the document, so nothing needs dismissing.
   */
  async dismissDatePicker() {
    /* C-2 no longer exists — see the note above. */
  }

  /**
   * What the date field actually shows.
   *
   * SUPERSEDED BEHAVIOUR (ADR-009): the legacy field was a text input that
   * AngularJS re-rendered from a bound Date, so this returned
   * "Tue Aug 25 2026 00:00:00 GMT+0200 (...)". A native date input returns the
   * calendar date as `yyyy-mm-dd`.
   */
  async dateFieldText(field) {
    return this.page.locator(`#${field}`).inputValue();
  }

  /** The same field as mm/dd/yyyy, for readable assertions. */
  async dateFieldAsCalendarDate(field) {
    const raw = await this.dateFieldText(field);
    if (!raw) return null;
    // Parsed explicitly rather than through `new Date(raw)`: an ISO date string
    // is parsed as UTC, which shifts the day in negative offsets. ADR-009 is
    // about exactly this class of implicit parse, and it applies to the harness
    // as much as to the application.
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!match) return null;
    const [, year, month, day] = match;
    return `${month}/${day}/${year}`;
  }

  // ------------------------------------------------------------------- search

  async search() {
    await this.searchButton.click();
  }

  async waitForResults() {
    await this.page.waitForFunction(
      () => {
        const sc = window.__flightSearch && window.__flightSearch.scope;
        return !!sc && sc.isLoading === false && sc.hasSearched === true;
      },
      null,
      { timeout: 25000 }
    );
    await this.overlay.waitFor({ state: 'hidden' }).catch(() => {});
  }

  async searchAndWait() {
    await this.search();
    await this.waitForResults();
  }

  /**
   * Wait for an in-flight request to settle.
   *
   * Added in Increment 1 so the `I book the selected flight` step no longer has
   * to reach into the framework itself — see the note in
   * `tests/steps/flight-search.steps.js`.
   */
  async waitForIdle() {
    await this.page.waitForFunction(
      () => {
        const sc = window.__flightSearch && window.__flightSearch.scope;
        return !!sc && sc.isLoading === false;
      },
      null,
      { timeout: 20000 }
    );
  }

  // ------------------------------------------------------------------ results

  /** Heading above the list: "N flights found". */
  async resultCountFromHeading() {
    const heading = this.page.locator('h4.panel-title', { hasText: /flights found/i }).first();
    if (!(await heading.isVisible().catch(() => false))) return null;
    const text = await heading.innerText();
    const match = text.match(/(\d+)\s+flights?\s+found/i);
    return match ? Number(match[1]) : null;
  }

  async resultCount() {
    return this.results.count();
  }

  /**
   * Every visible result row, parsed into plain data. The DOM structure is
   * carried over from the legacy template unchanged, so this parser is too.
   */
  async resultRows() {
    return this.results.evaluateAll((nodes) =>
      nodes.map((node) => {
        const cols = node.querySelectorAll('.row > div');
        const clean = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
        const whole = clean(node);
        const times = [...node.querySelectorAll('span.h4')].map((el) => clean(el));
        const durationText = (whole.match(/\d+h\s*\d+m/) || [])[0] || null;
        const durationMatch = durationText ? durationText.match(/(\d+)h\s*(\d+)m/) : null;

        let stops = null;
        if (/Non-stop/i.test(whole)) stops = 0;
        else if (/\b1 stop\b/i.test(whole)) stops = 1;
        else {
          const many = whole.match(/(\d+)\s+stops/i);
          if (many) stops = Number(many[1]);
        }

        return {
          text: whole,
          airline: clean(node.querySelector('strong')),
          flightNumber: clean(node.querySelector('small.text-muted')),
          departureTime: times[0] || null,
          arrivalTime: times[1] || null,
          durationText,
          durationMinutes: durationMatch
            ? Number(durationMatch[1]) * 60 + Number(durationMatch[2])
            : null,
          stops,
          price: Number(clean(cols[cols.length - 1]).replace(/[^0-9.]/g, '').slice(0, 6)) || null,
          origin: clean(cols[1] && cols[1].querySelector('small')),
          destination: clean(cols[3] && cols[3].querySelector('small'))
        };
      })
    );
  }

  /** The details panel shown once a flight is selected. */
  async selectedFlightDetails() {
    const panel = this.detailsPanel;
    if (!(await panel.isVisible().catch(() => false))) return null;
    return panel.evaluate((node) => {
      const fields = {};
      node.querySelectorAll('p').forEach((p) => {
        const text = p.innerText.replace(/\s+/g, ' ').trim();
        const at = text.indexOf(':');
        if (at > 0) fields[text.slice(0, at).trim().toLowerCase()] = text.slice(at + 1).trim();
      });
      const heading = node.querySelector('h4');
      return {
        text: node.innerText.replace(/\s+/g, ' ').trim(),
        heading: heading ? heading.innerText.replace(/\s+/g, ' ').trim() : null,
        route: fields.route || null,
        date: fields.date || null,
        departure: fields.departure || null,
        arrival: fields.arrival || null,
        duration: fields.duration || null,
        stops: fields.stops || null,
        cabin: fields.cabin || null,
        aircraft: fields.aircraft || null
      };
    });
  }

  async prices() {
    return (await this.resultRows()).map((r) => r.price);
  }

  async airlines() {
    return (await this.resultRows()).map((r) => r.airline);
  }

  // ------------------------------------------------------- messages and toasts

  async validationError() {
    const box = this.page.locator('.alert-danger').first();
    if (!(await box.isVisible().catch(() => false))) return null;
    return (await box.innerText()).trim();
  }

  async notifications() {
    // Matches BOTH notification areas. This step is shared with the four
    // modules still served by AngularJS, whose area is `.notification-area`
    // (`app/index.html:41-45`); the React shell carries the same class.
    return this.page.locator('.notification-area .alert').allInnerTexts();
  }

  async latestNotification() {
    const all = await this.notifications();
    return all.length ? all[all.length - 1].trim() : null;
  }

  /**
   * Wait for a notification containing `fragment`, then return it.
   *
   * Notifications arrive AFTER the request that triggers them settles, so
   * sampling the list once is a race: it passes when the API is quick and fails
   * when the suite is under load. This polls instead.
   *
   * It changes how the scenario OBSERVES, never what it asserts — the same
   * class of change as re-pointing a selector (ADR-008 §5).
   */
  async waitForNotification(fragment, timeout = 15000) {
    const deadline = Date.now() + timeout;
    let seen = null;
    while (Date.now() < deadline) {
      const all = await this.notifications();
      seen = all.length ? all[all.length - 1].trim() : null;
      if (all.some((n) => n.includes(fragment))) return seen;
      await this.page.waitForTimeout(150);
    }
    return seen;
  }

  async emptyStateVisible() {
    return this.page.locator('text=No flights match your filters').isVisible().catch(() => false);
  }

  /**
   * Start recording announcements the app makes to the rest of the system.
   *
   * The legacy app talked to itself over the `$rootScope` event bus; React
   * announces through `src/lib/test-seam.ts`. In BOTH cases nothing consumes
   * `itinerary:refresh` — the announcement is the behaviour, and the consumer
   * arrives in Increment 3 (ADR-013).
   */
  async recordBroadcast(eventName) {
    await this.page.evaluate((name) => {
      window.__flightSearch = window.__flightSearch || { scope: null, events: {} };
      window.__flightSearch.events[name] = 0;
    }, eventName);
  }

  async broadcastCount(eventName) {
    return this.page.evaluate(
      (name) =>
        (window.__flightSearch &&
          window.__flightSearch.events &&
          window.__flightSearch.events[name]) || 0,
      eventName
    );
  }

  // ------------------------------------------------------------------ filters

  /** The "Max Price: $N" label the user reads. */
  async maxPriceLabelValue() {
    const label = this.page.locator('label', { hasText: /Max Price/i }).first();
    if (!(await label.isVisible().catch(() => false))) return null;
    const text = await label.innerText();
    const match = text.match(/\$([\d.]+)/);
    return match ? Number(match[1]) : null;
  }

  /** The bounds the slider offers: its floor is the cheapest flight found. */
  async maxPriceSliderBounds() {
    return this.page.locator('input[type="range"]').evaluate((el) => ({
      min: Number(el.min), max: Number(el.max), step: Number(el.step), value: Number(el.value)
    }));
  }

  /**
   * Move the range slider. Playwright's fill() rejects range inputs, so the
   * value is set and the events React listens for are dispatched, which is what
   * a real drag produces.
   *
   * React tracks the DOM value internally, so the native value setter is used
   * rather than `el.value = v` — otherwise React sees no change and skips the
   * re-render.
   */
  async setMaxPrice(value) {
    await this.page.locator('input[type="range"]').evaluate((el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, String(v));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }

  async filterByAirline(airline) {
    await this.page.locator('[data-testid="filter-airline"]').selectOption(airline);
  }

  async filterByStops(value) {
    await this.page.locator('[data-testid="filter-stops"]').selectOption(String(value));
  }

  async filterByDepartureTime(value) {
    await this.page.locator('[data-testid="filter-depart-time"]').selectOption(value);
  }

  // ------------------------------------------------------------------ sorting

  async sortBy(label) {
    await this.page.getByRole('button', { name: label }).click();
  }

  // ------------------------------------------------------- selection & booking

  async selectResult(index = 0) {
    await this.results.nth(index).click();
    await this.detailsPanel.waitFor({ state: 'visible' });
  }

  async book() {
    await this.page.getByRole('button', { name: /Book This Flight/i }).click();
  }
}

module.exports = FlightSearchPage;
