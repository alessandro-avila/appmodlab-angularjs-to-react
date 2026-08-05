/**
 * Page Object for the Flight Search screen of the legacy AngularJS portal.
 *
 * Two deliberate design choices, both forced by how the legacy app is built:
 *
 * 1. Dates are driven through the jQuery UI calendar widget, never by typing.
 *    The inputs are plain text fields upgraded by `$('#departDate')
 *    .datepicker(...)`; a typed value never fires `onSelect`, so the Angular
 *    model would stay null while the field looked filled. The open calendar
 *    also swallows pointer events (constraint C-2 in ADR-003), so it is
 *    dismissed with Escape before anything else is clicked.
 *
 * 2. A few assertions read the Angular scope rather than the DOM. They are
 *    limited to values the screen genuinely does not render — chiefly the
 *    numeric `filters.maxPrice` behind the range slider and the
 *    `priceRange.max` it is derived from. Everything a user can see is
 *    asserted through the DOM.
 */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** Runs in the browser: walk up from the form to the flight-search scope. */
function scopeReader(pickSource) {
  /* global angular, document */
  let sc = angular.element(document.querySelector('form') || document.body).scope();
  while (sc && !sc.searchParams) sc = sc.$parent;
  if (!sc) return null;
  // eslint-disable-next-line no-new-func
  return new Function('sc', 'return (' + pickSource + ')(sc);')(sc);
}

class FlightSearchPage {
  constructor(page) {
    this.page = page;
    this.origin = page.locator('#origin');
    this.destination = page.locator('#destination');
    this.passengers = page.locator('#passengers');
    this.cabinClass = page.locator('#cabinClass');
    this.searchButton = page.getByRole('button', { name: /Search Flights/i });
    this.overlay = page.locator('#search-overlay');
    this.picker = page.locator('#ui-datepicker-div');
    this.results = page.locator('.list-group a.list-group-item');
    this.detailsPanel = page.locator('#flight-details');
  }

  // ---------------------------------------------------------------- navigation

  async open() {
    await this.page.goto('http://localhost:8080/#!/flights', { waitUntil: 'domcontentloaded' });
    await this.searchButton.waitFor({ state: 'visible' });
    // The datepickers are wired inside a $timeout(..., 0); wait for that.
    await this.page.waitForFunction(
      () => !!(window.jQuery && window.jQuery('#departDate').data('datepicker')),
      null, { timeout: 15000 }
    );
  }

  /** Read a value out of the flight-search scope. `pick` is a fn of the scope. */
  async readScope(pick) {
    return this.page.evaluate(
      ({ src, pickSrc }) => new Function('pickSource', 'return (' + src + ')(pickSource);')(pickSrc),
      { src: scopeReader.toString(), pickSrc: pick.toString() }
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
   * Pick a date through the calendar widget. `date` is 'mm/dd/yyyy'.
   * Returns without leaving the calendar open.
   *
   * The day is selected with a dispatched click rather than a real one. Once
   * search results are on screen the calendar's lower rows are covered by the
   * results list — the widget renders at z-index 1 while Bootstrap's list items
   * sit above it — so a genuine pointer click never reaches those days. That
   * overlap is real and is asserted on its own terms in the scenario "Once
   * results are shown, the end of the month cannot be clicked"; dispatching the
   * event here keeps it from blocking every other scenario that merely needs a
   * date.
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

  /**
   * What the date field actually shows. Angular re-renders the model into the
   * text input, so this is a raw JavaScript Date string
   * ("Tue Aug 25 2026 00:00:00 GMT+0200 ..."), not "08/25/2026".
   */
  async dateFieldText(field) {
    return this.page.locator(`#${field}`).inputValue();
  }

  /** The same field parsed to mm/dd/yyyy, for readable assertions. */
  async dateFieldAsCalendarDate(field) {
    const raw = await this.dateFieldText(field);
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(parsed.getMonth() + 1)}/${pad(parsed.getDate())}/${parsed.getFullYear()}`;
  }

  // ------------------------------------------------------------------- search

  async search() {
    await this.dismissDatePicker();
    await this.searchButton.click();
  }

  async waitForResults() {
    await this.page.waitForFunction(
      () => {
        let sc = angular.element(document.querySelector('form') || document.body).scope();
        while (sc && !sc.searchParams) sc = sc.$parent;
        return !!sc && sc.isLoading === false && sc.hasSearched === true;
      },
      null, { timeout: 25000 }
    );
    await this.overlay.waitFor({ state: 'hidden' }).catch(() => {});
  }

  async searchAndWait() {
    await this.search();
    await this.waitForResults();
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
   * Every visible result row, parsed into plain data.
   * The row shows airline, flight number, departure and arrival times, duration,
   * stop count and price — but no date; the date appears only once a flight is
   * selected, in the details panel.
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

  /** Notifications accumulate in $rootScope and are never dismissed. */
  async notifications() {
    return this.page.locator('.notification-area .alert').allInnerTexts();
  }

  async latestNotification() {
    const all = await this.notifications();
    return all.length ? all[all.length - 1].trim() : null;
  }

  async emptyStateVisible() {
    return this.page.locator('text=No flights match your filters').isVisible().catch(() => false);
  }

  /**
   * Start recording $rootScope broadcasts so a scenario can assert that the
   * app told other components something happened. The legacy app talks to
   * itself over the root scope event bus; there is no other observable trace.
   */
  async recordBroadcast(eventName) {
    await this.page.evaluate((name) => {
      const rootScope = angular.element(document.body).injector().get('$rootScope');
      window.__broadcasts = window.__broadcasts || {};
      window.__broadcasts[name] = 0;
      rootScope.$on(name, () => { window.__broadcasts[name] += 1; });
    }, eventName);
  }

  async broadcastCount(eventName) {
    return this.page.evaluate(
      (name) => (window.__broadcasts && window.__broadcasts[name]) || 0,
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
   * value is set and the events Angular listens for are dispatched, which is
   * what a real drag produces.
   */
  async setMaxPrice(value) {
    await this.page.locator('input[type="range"]').evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }

  /**
   * Hit-test every selectable day against the flight the user has selected.
   * Bootstrap gives the selected row `z-index: 2` while the calendar widget
   * renders at `z-index: 1`, so the selected row paints over it.
   */
  async unreachableCalendarDays(field) {
    await this.page.locator(`#${field}`).click();
    await this.picker.waitFor({ state: 'visible' });
    const result = await this.page.evaluate(() => {
      const days = [...document.querySelectorAll('#ui-datepicker-div td[data-handler="selectDay"] a')];
      const selectedRow = document.querySelector('.list-group a.list-group-item.active');
      const intersects = (a, b) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

      const blocked = [];
      const overlapping = [];
      days.forEach((a) => {
        const box = a.getBoundingClientRect();
        if (selectedRow && intersects(box, selectedRow.getBoundingClientRect())) {
          overlapping.push(a.textContent.trim());
        }
        const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        if (!(top === a || a.contains(top))) {
          blocked.push({
            day: a.textContent.trim(),
            coveredBy: top ? top.tagName.toLowerCase() : null,
            coveredByClass: top ? String(top.className) : null,
            coveredBySelectedFlight: !!(top && top.closest('.list-group a.list-group-item.active'))
          });
        }
      });

      return {
        total: days.length,
        blocked,
        overlapping,
        hasSelectedRow: !!selectedRow,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      };
    });
    await this.dismissDatePicker();
    return result;
  }

  async filterByAirline(airline) {
    await this.page.locator('select[ng-model="filters.airline"]').selectOption(airline);
  }

  async filterByStops(value) {
    await this.page.locator('select[ng-model="filters.stops"]').selectOption(String(value));
  }

  async filterByDepartureTime(value) {
    await this.page.locator('select[ng-model="filters.departTimeRange"]').selectOption(value);
  }

  // ------------------------------------------------------------------ sorting

  /**
   * The sort buttons are matched on their visible label rather than an exact
   * accessible name: "Price" carries a trailing space from the sort-direction
   * icon inside it, which an exact match will not accept.
   */
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
