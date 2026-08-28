/**
 * Page Object for the itinerary screen — React since Increment 3.
 *
 * Two of this screen's controls remain non-functional, DELIBERATELY (ADR-019).
 * In AngularJS the cause was scope inheritance; the React port models both
 * scopes explicitly so the behaviour is identical. The scenarios still prove it
 * twice — through the interface and again by reaching behind it. The helpers
 * that reach behind are named `...ByDrivingController` exactly as before, so a
 * reader can never mistake them for something a traveller could do.
 *
 * Scope note: the route publishes a scope-shaped snapshot at
 * `window.__flightSearch.scope` (see `src/lib/test-seam.ts`) carrying the same
 * property names the AngularJS controller scope did — trips, selectedTrip,
 * itinerary, isLoading, errorMessage, viewMode, filterStatus, displayDays,
 * newNote. Every `pick` written against the legacy app keeps working.
 *
 * `readDetailsScope` is gone: it existed to read the ng-if CHILD scope, and
 * React has no scope chain. What it observed — that the buttons write somewhere
 * the logic never reads — is now observed through `filterButtonIsHighlighted`
 * (the child half) and `controllerFilterStatus` (the parent half).
 */
const { BASE_URL } = require('../support/world');

class ItineraryPage {
  constructor(page) {
    this.page = page;
    this.container = page.locator('.itinerary-container');
    this.details = page.locator('#itinerary-details');
    this.tripRows = page.locator('.panel-default > .list-group > a.list-group-item');
    this.summaryCards = page.locator('#itinerary-details .panel-primary .panel-body .col-md-3');
    this.detailsHeading = page.locator('#itinerary-details .panel-primary .panel-title');
    this.dayPanels = page.locator('.itinerary-list > .panel');
    this.dayHeadings = page.locator('.itinerary-list > .panel > .panel-heading .panel-title');
    this.itemRows = page.locator('.itinerary-list .list-group-item');
    this.timeline = page.locator('.itinerary-timeline');
    this.timelineEntries = page.locator('.itinerary-timeline .panel-body');
    this.notifications = page.locator('.notification-area .alert');
  }

  async open() {
    await this.page.goto(`${BASE_URL}/itinerary`, { waitUntil: 'domcontentloaded' });
    await this.container.waitFor({ state: 'visible', timeout: 20000 });
    await this.page.waitForFunction(
      () => !!(window.__flightSearch && window.__flightSearch.scope),
      null,
      { timeout: 20000 }
    );
    await this.details.waitFor({ state: 'visible', timeout: 20000 });
    // The details scroll into view after they render; let it settle.
    await this.page.waitForTimeout(700);
  }

  /** Read from the published scope snapshot. */
  async readScope(pick) {
    return this.page.evaluate(
      (pickSrc) => new Function('sc', 'return (' + pickSrc + ')(sc);')(window.__flightSearch.scope),
      pick.toString()
    );
  }

  // ------------------------------------------------------------- the trip list

  async tripNames() {
    return this.readScope((sc) => sc.trips.map((t) => t.name));
  }

  tripRow(name) {
    return this.tripRows.filter({ hasText: name });
  }

  async tripRowText(name) {
    return (await this.tripRow(name).innerText()).replace(/\s+/g, ' ').trim();
  }

  async tripStatusLabel(name) {
    return (await this.tripRow(name).locator('.label').innerText()).trim();
  }

  async tripPrice(name) {
    return (await this.tripRow(name).locator('.col-xs-2 strong').innerText()).trim();
  }

  async tripDates(name) {
    return (await this.tripRow(name).locator('.col-xs-3 small').first().innerText()).trim();
  }

  async tripDuration(name) {
    return (await this.tripRow(name).locator('.col-xs-3 .text-muted').first().innerText()).trim();
  }

  /** Text of the <small> that binds trip.destination — expected to be blank. */
  async tripDestinations() {
    return this.tripRows.locator('.col-xs-4 small').allInnerTexts();
  }

  async countdownCount() {
    return this.tripRows.locator('.col-xs-3 .text-muted').filter({ hasText: /in \d+ days/ }).count();
  }

  async openTrip(name) {
    await this.tripRow(name).click();
    await this.page.waitForFunction(
      (n) => {
        const sc = window.__flightSearch && window.__flightSearch.scope;
        return sc && sc.selectedTrip && sc.selectedTrip.name === n && !sc.isLoading && sc.itinerary;
      },
      name,
      { timeout: 20000 }
    );
    await this.page.waitForTimeout(700);
  }

  async openTripName() {
    return this.readScope((sc) => (sc.selectedTrip ? sc.selectedTrip.name : null));
  }

  // ---------------------------------------------------------- the trip summary

  /** [{ label, amount }] straight off the rendered cards. */
  async summary() {
    const cards = await this.summaryCards.all();
    const out = [];
    for (const c of cards) {
      out.push({
        label: (await c.locator('h4').innerText()).trim(),
        amount: (await c.locator('h3').innerText()).trim()
      });
    }
    return out;
  }

  async headingText() {
    return (await this.detailsHeading.innerText()).replace(/\s+/g, ' ').trim();
  }

  /** Just the "{{name}} — {{destination}}" part, before the date range span. */
  async headingTitlePart() {
    return this.detailsHeading.evaluate((el) => {
      const clone = el.cloneNode(true);
      const span = clone.querySelector('.pull-right');
      if (span) span.remove();
      return clone.textContent.replace(/\s+/g, ' ').trim();
    });
  }

  // ------------------------------------------------------------ the day breakdown

  async dayLabels() {
    const headings = await this.dayHeadings.allInnerTexts();
    return headings.map((h) => (h.replace(/\s+/g, ' ').trim().match(/^(Day \d+)/) || [])[1]);
  }

  async dayHeadingTexts() {
    const headings = await this.dayHeadings.allInnerTexts();
    return headings.map((h) => h.replace(/\s+/g, ' ').trim());
  }

  dayPanel(label) {
    return this.dayPanels.filter({ has: this.page.locator('.panel-title', { hasText: new RegExp(`^\\s*${label}\\b`) }) });
  }

  async itemDescriptionsOn(dayLabel) {
    const texts = await this.dayPanel(dayLabel).locator('.list-group-item .col-md-5 small').allInnerTexts();
    return texts.map((t) => t.trim());
  }

  /** The <strong> that binds item.title. */
  async itemHeadlines() {
    const texts = await this.itemRows.locator('.col-md-5 > strong').allInnerTexts();
    return texts.map((t) => t.trim());
  }

  async itemDescriptions() {
    const texts = await this.itemRows.locator('.col-md-5 small').allInnerTexts();
    return texts.map((t) => t.trim());
  }

  async itemStatuses() {
    const texts = await this.itemRows.locator('.col-md-2 .label').allInnerTexts();
    return texts.map((t) => t.trim());
  }

  async rowTime(index) {
    return (await this.itemRows.nth(index).locator('.col-md-2:not(.text-right) > strong').innerText()).trim();
  }

  async rowStatus(index) {
    return (await this.itemRows.nth(index).locator('.col-md-2 .label').innerText()).trim();
  }

  async rowCost(index) {
    return (await this.itemRows.nth(index).locator('.col-md-2.text-right strong').innerText()).trim();
  }

  itemRow(description) {
    return this.itemRows.filter({ hasText: description });
  }

  async itemLabel(description) {
    return (await this.itemRow(description).locator('.col-md-2 .label').innerText()).trim();
  }

  async itemRowClass(description) {
    return this.itemRow(description).getAttribute('class');
  }

  async itemHasCancelButton(description) {
    return (await this.itemRow(description).locator('button.btn-danger').count()) > 0;
  }

  // ------------------------------------------------------------ the status filter

  filterButton(label) {
    return this.details.locator('.btn-group').getByRole('button', { name: label, exact: true });
  }

  async filterBy(label) {
    await this.filterButton(label).click();
    await this.page.waitForTimeout(400);
  }

  async filterButtonIsHighlighted(label) {
    const cls = await this.filterButton(label).getAttribute('class');
    return /btn-(primary|success|warning|danger)/.test(cls);
  }

  async controllerFilterStatus() {
    return this.readScope((sc) => sc.filterStatus);
  }

  async controllerHasComputedDays() {
    return this.readScope((sc) => sc.displayDays !== undefined);
  }

  // -------------------------------------------------------------------- notes

  noteBox(index) {
    return this.itemRows.nth(index).locator('input[placeholder="Add a note..."]');
  }

  addNoteButton(index) {
    return this.itemRows.nth(index).locator('.input-group-btn button');
  }

  async typeNote(index, text) {
    await this.noteBox(index).fill(text);
    await this.page.waitForTimeout(300);
  }

  async noteBoxValue(index) {
    return this.noteBox(index).inputValue();
  }

  async controllerNoteBox() {
    return this.readScope((sc) => sc.noteDrafts);
  }

  async notesOn(index) {
    const wells = this.itemRows.nth(index).locator('.well');
    if ((await wells.count()) === 0) return [];
    const texts = await wells.allInnerTexts();
    return texts.map((t) => t.replace(/\s+/g, ' ').trim());
  }

  // --------------------------------------------------------------- cancelling

  async cancelItem(description, { accept = true } = {}) {
    const seen = [];
    const handler = async (dialog) => {
      seen.push({ type: dialog.type(), message: dialog.message() });
      if (accept) await dialog.accept();
      else await dialog.dismiss();
    };
    this.page.on('dialog', handler);
    await this.itemRow(description).locator('button.btn-danger').first().click();
    await this.page.waitForTimeout(1500);
    this.page.off('dialog', handler);
    return seen;
  }

  // --------------------------------------------------------------- view modes

  /**
   * CSS uppercases these labels, which defeats an accessible-name match, so
   * they are addressed by position: List first, Timeline second.
   */
  get viewButtons() {
    return this.page.locator('.page-header .btn-group button');
  }

  async switchToTimeline() {
    await this.viewButtons.nth(1).click();
    await this.timeline.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(600);
  }

  async switchToList() {
    await this.viewButtons.nth(0).click();
    await this.page.locator('.itinerary-list').waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(600);
  }

  async listViewIsPresent() {
    return (await this.page.locator('.itinerary-list').count()) > 0;
  }

  async timelineText() {
    return (await this.timeline.innerText()).replace(/\s+/g, ' ');
  }

  /**
   * Who the app thinks is signed in, and what it kept in storage.
   *
   * The C-1 defect (ADR-003): identity is set only during the login exchange
   * and never persisted, so a restored session is authenticated but anonymous.
   * `authentication.feature:161/:170/:185` and `travel-request.feature` all
   * assert it.
   *
   * The screen may be either framework. AngularJS keeps the answer on
   * `$rootScope`; a React screen has no `angular` global at all, so the seam
   * answers instead. Both read the real thing — neither branch hard-codes a
   * result, so when Inc-6 repairs C-1 these scenarios go red on purpose.
   */
  async signedInIdentity() {
    return this.page.evaluate(() => {
      const storedKeys = Object.keys(localStorage);

      if (typeof angular !== 'undefined' && document.querySelector('[ui-view]')) {
        const rs = angular.element(document.body).injector().get('$rootScope');
        return {
          currentUser: rs.currentUser === undefined ? null : rs.currentUser,
          storedKeys
        };
      }

      const seam = window.__flightSearch;
      const user = seam && typeof seam.identity === 'function' ? seam.identity() : null;
      return { currentUser: user === undefined ? null : user, storedKeys };
    });
  }

  // ------------------------------------------------------------------ printing

  /**
   * ADR-017 — printing prints the live document. `window.print` is stubbed so
   * the native dialog never opens, and `window.open` is stubbed so the test can
   * prove no second window is created.
   */
  async stubPrint() {
    await this.page.evaluate(() => {
      window.__print = { printed: 0, opened: 0, titleWhilePrinting: null };
      window.print = () => {
        window.__print.printed += 1;
        window.__print.titleWhilePrinting = document.title;
      };
      const realOpen = window.open;
      window.open = (...args) => {
        window.__print.opened += 1;
        return realOpen.call(window, ...args);
      };
    });
  }

  async clickPrint() {
    await this.page.locator('.page-header button.no-print').click();
    await this.page.waitForTimeout(300);
  }

  async printRecord() {
    return this.page.evaluate(() => window.__print);
  }

  /** The @media print rules the route installs. */
  async printStyles() {
    return this.page.locator('[data-testid="print-styles"]').innerText();
  }

  async printRegionText() {
    return (await this.details.innerText()).replace(/\s+/g, ' ');
  }

  async noPrintCount() {
    return this.page.locator('#itinerary-details .no-print').count();
  }

  // ------------------------------------------------------------- notifications

  async lastNotification() {
    const n = await this.notifications.count();
    if (n === 0) return null;
    return (await this.notifications.nth(n - 1).innerText()).replace(/\s+/g, ' ').trim();
  }

  async notificationCount() {
    return this.notifications.count();
  }

  // ------------------------------------------------------ direct API readings

  /** What the server holds, independent of anything the client derived. */
  async serverTrips() {
    return this.page.evaluate(async () => {
      const r = await fetch('http://localhost:3000/api/trips', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('authToken') }
      });
      return r.json();
    });
  }

  async serverItem(tripId, itemId) {
    return this.page.evaluate(async ([t, i]) => {
      const r = await fetch('http://localhost:3000/api/trips/' + t, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('authToken') }
      });
      const trip = await r.json();
      return trip.items.find((x) => x.id === i) || null;
    }, [tripId, itemId]);
  }
}

module.exports = ItineraryPage;
